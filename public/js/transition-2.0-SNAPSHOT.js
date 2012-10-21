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
          TRACE: 0,
          DEBUG: 0,
          INFO:  0,
          WARN:  0,
          ERROR: 0,
          FATAL: 0
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
      testTimeout:     30 * 1000
    }
  });

  Models.TestState = TestState = Backbone.Model.extend({
    defaults: {
      name:        '**no name**',
      onEnter:     function () {
        throw 'no onEnter implemented!';
      },
      attrs:       {start: false, success: false, failure: false},
      transitions: {}
    }
  });

  Models.TestStates = TestStates = Backbone.Collection.extend({
    model: TestState
  });

  Models.Test = Test = Backbone.Model.extend({
    defaults: {
      name:         '**no name**',
      states:       new TestStates()
    },

    initialize: function (attributes) {
      // name, initialize, states
      this.set('name', attributes.name || '**no name**');
      this.set('initialize', attributes.initialize);
      this.get('states').reset(attributes.states);
      // NB: if there is no start state, define one
      this.startState = new TestState({
        name:    'start',
        onEnter: Transition.noop,
        attrs:   {start: true, 
          success: false,
          failure: false
        },
        transitions: {}
      });
      // NB: if there is no success state, define one
      this.successState = new TestState({
        name:    'success',
        onEnter: Transition.noop,
        attrs:   {start: true, 
          success: false,
          failure: false
        },
        transitions: {}
      });

      this.currentState = this.startState;
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
      this.set('repeatCount', 1 + this.get('repeatCount'));
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
      console.log('runClicked');
    },

    startClicked: function () {
      var test = models.suiteRunner.get('currentTest');
      console.log('startClicked: running test: %o', test.get('name'));
    },

    stopClicked: function () {
      console.log('stopClicked');
    },

    stepClicked: function () {
      console.log('stepClicked');
    },

    continueClicked: function () {
      console.log('continueClicked');
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
      models.settings.on('change', 'render', this);
    },

    remove: function () {
      models.settings.off('change', 'render', this);
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
      this.$dialogEl.dialog('close');
    },

    testTimeoutUpdated: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      console.log('testTimeoutUpdated %o', $(evt.target).val());
    },

    stateTimeoutUpdated: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      console.log('stateTimeoutUpdated %o', $(evt.target).val());
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
    },

    remove: function () {
      models.suiteRunner.off('all', this.render, this);
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
      models.logEntries.on('change', this.entryChanged,   this);
    },

    entryChanged: function (logEntry) {
      console.log('LogViewer.entryChanged');
    },

    removeLogEntry: function (logEntry) {
      console.log('LogViewer.removeLogEntry');
    },

    addLogEntry: function (logEntry) {
      // NB: don't push it on if it's the same as the one at the top of the
      // list, just increment it's repeat count
      var entryView = new LogEntryView({logEntry: logEntry});
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

  /********************************************************************************
   * Test Suite Management and Helpers
   *
   ********************************************************************************/
  Transition.newState = function () {
    var args = [].slice.call(arguments),
        stateName = args.pop(),
        onEnter   = args.pop(),
        attrs     = args.pop();
    return new TestState({
      name:        stateName,
      onEnter:     onEnter,
      attrs:       attrs,
      transitions: args
    });
  };

  Transition.addTest = function (options) {
    models.suite.add(new Test({
      name:   options.name,
      states: new TestStates(options.states)
    }));
    return this;
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
      message:     _.reduce(arguments, function (acc, str) {
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
    Transition.Log.newEntry.apply(Log.Levels.TRACE, arguments);
  };

  Transition.Log.debug = function () {
    Transition.Log.newEntry.apply(Log.Levels.DEBUG, arguments);
  };

  Transition.Log.info = function () {
    Transition.Log.newEntry.apply(Log.Levels.INFO, arguments);
  };

  Transition.Log.warn = function () {
    Transition.Log.newEntry.apply(Log.Levels.WARN, arguments);
  };

  Transition.Log.error = function () {
    Transition.Log.newEntry.apply(Log.Levels.ERROR, arguments);
  };

  Transition.Log.fatal = function () {
    Transition.Log.newEntry.apply(Log.Levels.FATAL, arguments);
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
