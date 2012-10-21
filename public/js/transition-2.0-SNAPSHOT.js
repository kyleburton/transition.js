/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console */
"use strict";

/********************************************************************************
 * Transition.js
 * Version: 2.0-SNAPSHOT
 ********************************************************************************/
(function () {
  var root        = this, 
    Transition  = {
      Log:       {
        Levels: { 
          TRACE: 99,
          DEBUG: 80,
          INFO:  60,
          WARN:  40,
          ERROR: 20,
          FATAL: 10
        }
      },
      Views:     {},
      Models:    {},
      Templates: {
        Runner: {}
      },
      views: {},
      models: {}
    },
    Views       = Transition.Views,
    Models      = Transition.Models,
    Templates   = Transition.Templates,
    mainFrame   = {
      document: this.parent.frames.main
    }, 
    runnerFrame = {
      document: this.parent.frames.test,
      $:        this.parent.frames.test && this.parent.frames.test.$
    },
    $ = this.parent.frames.test ? this.parent.frames.test.$ : jQuery,
    tmpl,
    addView,
    Settings,
    TestState,
    TestStates,
    Test,
    LogEntry,
    LogEntries,
    TestSuite,
    SuiteRunner,
    LogEntryView,
    Log = Transition.Log,
    models = Transition.models;

  root.Transition = Transition;
  Transition.$    = root.jQuery;
  if (!Transition.$) {
    throw 'Error: jQuery not found.';
  }

  /********************************************************************************
   * Templaates and caching.
   *
   ********************************************************************************/
  Transition.tmplCache = {};
  Transition.tmpl = tmpl = function (tmplId, data) {
    var tmpl = Transition.tmplCache[tmplId], tmplElt;
    if (!tmpl) {
      tmplElt = $('#' + tmplId);
      if (tmplElt.length === 0) {
        throw 'Error: template for id ' + tmplId + ' not found!';
      }
      tmpl = Transition.tmplCache[tmplId] = _.template(tmplElt.html());
    }
    return tmpl(data);
  };

  /********************************************************************************
   * Models
   *
   ********************************************************************************/
  Models.Settings = Settings = Backbone.Model.extend({
    defaults: {
      perStateTimeout: 10 * 1000,
      testTimeout:     30 * 1000,
      // NB: hook this into the UI
      maxTransitions:  20,
      // NB: hook this into the UI
      pollTimeout:     250,
      // NB: hook this into the UI
      logLevel:        Log.Levels.TRACE
      //logLevel:        Log.Levels.INFO
    }
  });

  Models.TestState = TestState = Backbone.Model.extend({
    defaults: {
      name:        '**no state name**',
      onEnter:     function () {
        throw 'no onEnter implemented!';
      },
      attrs:       {start: false, success: false, failure: false},
      transitions: {}
    },

    initialize: function (attributes) {
      var name = attributes.name;
      if (!attributes.name) {
        throw 'Error: TestState must have a name!';
      }
    }
  });

  Models.TestStates = TestStates = Backbone.Collection.extend({
    model: TestState,

    first: function () {
      return this.models[0];
    },

    last: function () {
      return this.models[this.models.length - 1];
    }

  });

  Models.Test = Test = Backbone.Model.extend({
    defaults: {
      name:         '**no test name**',
      isRunning: false
    },

    initialize: function (attributes) {
      var firstState, lastState, transitions;
      this.set('name', attributes.name || '**no test name**');
      this.set('initialize', attributes.initialize);
      this.set('states', new TestStates());
      this.get('states').reset(attributes.states);

      _.each(this.get('states').models, function (state) {
        if (state.get('attrs').start) {
          if (this.startState) {
            throw "Error: multiple start states in: " + this.get('name');
          }
          this.startState = state;
        }

        if (state.get('attrs').success) {
          if (this.successState) {
            throw "Error: multiple success states in: " + this.get('name');
          }
          this.successState = state;
        }
      });

      if (!this.get('states').first()) {
        this.get('states').add(new TestState({
          name:    'start',
          onEnter: Transition.noop,
          attrs:   {
            start: true, 
            success: false,
            failure: false
          },
          transitions: transitions
        }));
        this.startState = this.get('states').first();
      }

      if (!this.startState) {
        firstState = this.get('states').first();
        transitions = {};
        transitions[firstState.get('name')] = {};
        transitions[firstState.get('name')].to = firstState.get('name');
        transitions[firstState.get('name')].pred = Transition.constantly_(true);
        this.startState = new TestState({
          name:    'start',
          onEnter: Transition.noop,
          attrs:   {
            start: true, 
            success: false,
            failure: false
          },
          transitions: transitions
        });
        this.get('states').add(this.startState);
      }

      if (!this.successState) {
        this.successState = new TestState({
          name:    'success',
          onEnter: Transition.noop,
          attrs:   {start: true, 
            success: false,
          failure: false
          },
          transitions: {}
        });
        this.get('states').add(this.successState);
      }

      // NB: validate the graph: that there are no unreachable states

      this.set('currentState', this.startState);
    },

    labelClass: function () {
      if (this.get('isRunning')) {
        return 'label-success';
      }
      return '';
    },

    getState: function (name) {
      var test;
      this.get('states').each(function (st) {
        return st.get('name') === name;
      });
      return test;
    }
  });

  Models.TestSuite = TestSuite = Backbone.Collection.extend({
    model: Test
  });

  Models.SuiteRunner = SuiteRunner = Backbone.Model.extend({
    defaults: {
      currentTest: new Test({})
    },

    initialize: function (ourModels, options) {
      models.suite.on('add', this.trackCurrentTest, this);
    },

    trackCurrentTest: function (test) {
      console.log('trackCurrentTest: %o', test);
      this.set('currentTest', test);
      models.suite.off('add', this.trackCurrentTest, this);
    }

  });

  Models.LogEntry = LogEntry = Backbone.Model.extend({
    defaults: {
      level:       Transition.Log.Levels.INFO,
      test:        null,
      testState:   null,
      timestamp:   '*test state*',
      repeatCount: 1,
      message:     '*message*'
    },

    initialize: function (attributes) {
      this.set('timestamp', new Date());
      this.set('test',      models.suiteRunner.get('currentTest'));
      this.set('testState', models.suiteRunner.get('currentTest').get('currentState'));
    },

    countRepeat: function () {
      this.set('timestamp', new Date());
      this.set('repeatCount', 1 + this.get('repeatCount'));
    },

    classForLevel: function () {
      if (this.get('labelClass')) {
        return this.get('labelClass');
      }

      if (this.get('level') >= Log.Levels.DEBUG) {
        return '';
      }
      if (this.get('level') >= Log.Levels.INFO) {
        return 'label-info';
      }
      if (this.get('level') >= Log.Levels.WARN) {
        return 'label-warning';
      }
      if (this.get('level') >= Log.Levels.ERROR) {
        return 'label-important';
      }
      return 'label-inverse';
    }

  });

  Models.LogEntries = LogEntries = Backbone.Collection.extend({
    model: LogEntry,
    first: function () {
      if (this.models.length > 0) {
        return this.models[0];
      }
      return null;
    }
  });

  /********************************************************************************
   * Views
   *
   ********************************************************************************/
  Views.Navbar = Backbone.View.extend({
    templateId: 'navbar-tmpl',

    events: {
      'click .settings': 'showSettings',
      'click a.test':    'testSelected'
    },

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      _.bindAll(this, 'showSettings');
      models.suite.on('all', this.render, this);
    },

    remove: function () {
      models.suite.off('all', this.render);
      this.$el.remove();
    },

    showSettings: function () {
      console.log('show the settings dialog');
      Transition.views.settings.display();
    },

    testSelected: function (evt) {
      evt.preventDefault();
      var dest = $(evt.target).attr('href');
      console.log('testSelected: %o => %o', $(evt.target), dest);
      Transition.router.navigate(dest, {trigger: true});
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {suite: models.suite}));
      this.$('.dropdown-toggle').dropdown();
      return this;
    }
  });

  Views.Controls = Backbone.View.extend({
    templateId: 'transition-runner-controls-tmpl',

    events: {
      'click button[name=run]':      'runClicked',
      'click button[name=stop]':     'stopClicked',
      'click button[name=start]':    'startClicked',
      'click button[name=step]':     'stepClicked',
      'click button[name=continue]': 'continueClicked',
      'click button[name=reload]':   'reloadClicked',
      'click button[name=clear]':    'clearClicked'
    },

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      _.bindAll(this, 'runClicked');
      _.bindAll(this, 'stopClicked');
      _.bindAll(this, 'stepClicked');
      _.bindAll(this, 'continueClicked');
      _.bindAll(this, 'reloadClicked');
      _.bindAll(this, 'clearClicked');
    },

    runClicked: function () {
      Transition.runSuite();
    },

    startClicked: function () {
      Transition.runTest();
    },

    stopClicked: function () {
      Transition.stop();
    },

    stepClicked: function () {
      Transition.step();
    },

    continueClicked: function () {
      Transition.cont();
    },

    reloadClicked: function () {
      console.log('reloadClicked');
    },

    clearClicked: function (evt) {
      console.log('clearClicked');
      models.logEntries.reset([]);
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {}));
      return this;
    }
  });

  Views.SuiteProgressBar = Backbone.View.extend({
    templateId: 'transition-runner-progress-bar-tmpl',

    events: {
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {}));
      $('.dropdown-toggle').dropdown();
      return this;
    }
  });

  Views.Settings = Backbone.View.extend({
    templateId: 'transition-runner-settings-modal-tmpl',

    events: {
      'click button':               'closeClicked',
      'change input#test-timeout':  'testTimeoutUpdated',
      'change input#state-timeout': 'stateTimeoutUpdated'
    },

    initialize: function (options) {
      this.constructor.__super__.initialize.apply(this, []);
      _.bindAll(this, 'closeClicked');
      _.bindAll(this, 'display');
      _.bindAll(this, 'testTimeoutUpdated');
      _.bindAll(this, 'stateTimeoutUpdated');
      models.settings.on('change', this.render, this);
    },

    remove: function () {
      models.settings.off('change', this.render, this);
      this.$el.remove();
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, models.settings));
      this.$dialogEl = $('#transition-runner-settings-modal-container');
      this.$dialogEl.html(this.el);
      this.$dialogEl.dialog({
        modal:     true,
        autoOpen:  false,
        title:     'Settings',
        width: 600
      });
      this.$dialogEl.parent().find('.ui-dialog-titlebar').css('display', 'none');
      this.delegateEvents();
    },

    closeClicked: function () {
      console.log('closeClicked');
      this.$dialogEl.dialog('close');
    },

    testTimeoutUpdated: function (evt) {
      models.settings.set('testTimeout', $(evt.target).val());
      return true;
    },

    stateTimeoutUpdated: function (evt) {
      models.settings.set('perStateTimeout', $(evt.target).val());
      return true;
    },

    display: function () {
      this.$dialogEl.dialog('open');
    }

  });

  Views.CurrentTestState = Backbone.View.extend({
    templateId: 'transition-runner-current-test-state-tmpl',

    events: {
    },

    initialize: function (options) {
      this.constructor.__super__.initialize.apply(this, []);
      models.suiteRunner.on('all', this.render, this);
      models.settings.on('change', this.render, this);
    },

    remove: function () {
      models.suiteRunner.off('all', this.render, this);
      models.settings.off('change', this.render, this);
      this.$el.remove();
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, models.suiteRunner.get('currentTest')));
    }
  });

  Views.LogEntryView = LogEntryView = Backbone.View.extend({
    templateId: 'transition-runner-log-entry-tmpl',

    initialize: function (options) {
      this.constructor.__super__.initialize.apply(this, []);
      this.logEntry = options.logEntry;
      this.logEntry.on('change', this.render, this);
    },

    remove: function () {
      this.logEntry.off('change', this.render, this);
      this.$el.remove();
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, this.logEntry));
      return this;
    }

  });

  Views.LogViewer = Backbone.View.extend({
    tagName: 'div',

    entryViews: {},

    initialize: function (options) {
      this.constructor.__super__.initialize.apply(this, []);
      models.logEntries.on('reset',  this.render,         this);
      models.logEntries.on('add',    this.addLogEntry,    this);
      models.logEntries.on('remove', this.removeLogEntry, this);
    },

    removeLogEntry: function (logEntry) {
      console.log('LogViewer.removeLogEntry');
    },

    addLogEntry: function (logEntry) {
      // NB: don't push it on if it's the same as the one at the top of the
      // list, just increment it's repeat count
      var entryView = new LogEntryView({logEntry: logEntry});
      if (logEntry.get('level') > models.settings.get('logLevel')) {
        return;
      }
      entryView.render();
      this.entryViews[logEntry.cid] = entryView;
      this.$el.prepend(entryView.$el);
    },

    render: function () {
      _.each(this.entryViews, function (entryView, cid) {
        entryView.remove();
      });
      models.logEntries.each(this.addLogEntry, this);
    }

  });


  /********************************************************************************
   * View Helpers
   *
   ********************************************************************************/
  Transition.addView = addView = function (name, clazz, appendToSelector, cdata, rdata) {
    var view = new clazz(cdata);
    Transition.views[name] = view;
    view.render(rdata);
    view.$el.appendTo(appendToSelector);
    return view;
  };

  Transition.pollFn = function () {
    Log.trace('Transition.pollFn');
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  Transition.runSuite = function () {
    console.log('Transition.runSuite: start the sutie at the first non-pending test, at it\'s start state');
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  Transition.runTest = function () {
    var test = models.suiteRunner.get('currentTest');
    test.set('currentState', test.getState('start'));
    console.log('startClicked: start test at it\'s start state: %o', test.get('name'));
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  Transition.stop = function () {
    console.log('Transition.stop');
    clearTimeout(Transition.pollTimeoutId);
    Transition.pollTimeoutId = null;
  };

  Transition.step = function () {
    console.log('Transition.step');
  };

  Transition.cont = function () {
    console.log('Transition.cont');
  };

  /********************************************************************************
   * Test Suite Management and Helpers
   *
   ********************************************************************************/
  Transition.newState = function () {
    var args = [].slice.call(arguments),
        stateName = args.shift(),
        onEnter   = args.shift(),
        attrs     = args.shift(),
        state = new TestState({
      name:        stateName,
      onEnter:     onEnter,
      attrs:       attrs,
      transitions: args
    });
    return state;
  };

  Transition.addTest = function (options) {
    try {
      var test = new Test({
        name:   options.name,
        states: options.states
      });
      return this;
    }
    catch (e) {
      console.log(e.get_stack());
      console.error(e);
      Log.fatal("Error registering test: " + options.name);
    }
  };

  Transition.noop = function () {
  };

  Transition.constantly_ = function (val) {
    return function () {
      return val;
    };
  };

  Transition.navigateTo = function (dest) {
    mainFrame.document.location = dest;
  };

  Transition.navigateTo_ = function (dest) {
    return function () {
      Transition.navigateTo(dest);
    };
  };

  Transition.elementExists = function (selector) {
    var result = $(mainFrame).find(selector);
    return result.length > 0;
  };

  Transition.elementExists_ = function (selector) {
    return function () {
      return Transition.elementExists(selector);
    };
  };

  Transition.Log.newEntry = function (level, args) {
    var entry = new LogEntry({
      level:       level,
      testName:    models.suiteRunner.get('currentTest'),
      testState:   models.suiteRunner.get('currentTest').get('currentState'),
      timestamp:   '*test state*',
      repeatCount: 1,
      message:     _.reduce(args, function (acc, str) {
          return acc + str;
        },
        ''
      )
    });

    if (models.logEntries.models.length > 1 &&
        models.logEntries.first().get('message') === entry.get('message')) {
      models.logEntries.first().countRepeat();
      return models.logEntries.first();
    }

    models.logEntries.unshift(entry);
    return entry;
  };

  Transition.Log.trace = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.TRACE, arguments);
  };

  Transition.Log.debug = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.DEBUG, arguments);
  };

  Transition.Log.info = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.INFO, arguments);
  };

  Transition.Log.warn = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.WARN, arguments);
  };

  Transition.Log.error = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.ERROR, arguments);
  };

  Transition.Log.fatal = function () {
    Transition.Log.newEntry.call(Transition, Log.Levels.FATAL, arguments);
  };

  /********************************************************************************
   * Router
   *
   ********************************************************************************/
  Transition.Router = Backbone.Router.extend({
    routes: {
      "test/:name":     "showTest",
      "*any":           "main"
    },

    showTest: function (testName) {
      var currTest;

      if (models.suite.length < 1) {
        return;
      }

      currTest = models.suite.find(function (elt) {
        return elt.get('name') === testName;
      });

      models.suiteRunner.set('currentTest', currTest);
      console.log('route[showTest(' + testName + ')]');
    },

    main: function () {
      console.log('route[main] no test selected');
    }

  });

  models.suite       = new TestSuite();
  models.settings    = new Models.Settings();
  models.suiteRunner = new SuiteRunner();
  models.logEntries  = new LogEntries();

  /********************************************************************************
   * Construct the Runner
   *
   ********************************************************************************/
  Transition.buildRunner = function () {
    Transition.router  = new Transition.Router();
    Log.info('router initialized');
    addView('navBar',           Views.Navbar,           '#transition-runner-menubar');
    addView('progressBar',      Views.SuiteProgressBar, '#transition-runner-progress-bar');
    addView('controls',         Views.Controls,         '#transition-runner-controls');
    addView('settings',         Views.Settings,         '#transition-runner-settings-modal-container');
    addView('currentTestState', Views.CurrentTestState, '#transition-runner-current-test-state');
    addView('logViewer',        Views.LogViewer,        '#transition-runner-log-viewer');
    Log.info('views initialized');
    Backbone.history.start();
    Log.info('runner initialization completed.');
  };


  //Transition.buildRunner();
}.call(this));
