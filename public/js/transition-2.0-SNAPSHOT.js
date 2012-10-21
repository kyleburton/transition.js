/********************************************************************************
 * Transition.js
 * Version: 2.0-SNAPSHOT
 ********************************************************************************/
(function () {
  var root        = this, 
      Transition  = {
        Views:     {},
        Models:    {},
        Templates: {
          Runner: {}
        },
        views: {},
        models: {},
      },
      Views       = Transition.Views,
      Models      = Transition.Models,
      Templates   = Transition.Templates,
      mainFrame   = {
        document: this.parent.frames.main,
      }, 
      runnerFrame = {
        document: this.parent.frames.test,
        $:        this.parent.frames.test && this.parent.frames.test.$
      },
      $ = this.parent.frames.test ? this.parent.frames.test.$ : jQuery,
      tmpl,
      addView,
      Settings,
      models = Transition.models;

  root.Transition = Transition;
  Transition.$    = root.jQuery;
  if (!Transition.$) {
    throw('Error: jQuery not found.');
  }

  /********************************************************************************
   * Templaates and caching.
   *
   ********************************************************************************/
  Transition.tmplCache = {};
  Transition.tmpl = tmpl = function (tmplId, data) {
    var tmpl = Transition.tmplCache[tmplId], tmplElt;
    if (!tmpl) {
      tmplElt = $('#'+tmplId);
      if (tmplElt.length === 0) {
        throw('Error: template for id ' + tmplId + ' not found!');
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
        throw('no onEnter implemented!');
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
      name: '**no name**',
      states: new TestStates()
    }
  });

  Models.TestSuite = TestSuite = Backbone.Collection.extend({
    model: Test
  });

  Models.SuiteRunner = SuiteRunner = Backbone.Model.extend({
    defaults: {
      currentTest: new Test()
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
      'click button[name=step]':     'stepClicked',
      'click button[name=continue]': 'continueClicked',
      'click button[name=reload]':   'reloadClicked'
    },

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      _.bindAll(this, 'runClicked');
      _.bindAll(this, 'stopClicked');
      _.bindAll(this, 'stepClicked');
      _.bindAll(this, 'continueClicked');
      _.bindAll(this, 'reloadClicked');
    },

    runClicked: function () {
      console.log('runClicked');
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
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, models.suiteRunner.get('currentTest')));
    },
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
    return mainFrame.document.location = dest;
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

  /********************************************************************************
   * Construct the Runner
   *
   ********************************************************************************/
  Transition.buildRunner = function () {
    Transition.router  = new Transition.Router();
    addView('navBar',           Views.Navbar,           '#transition-runner-menubar');
    addView('progressBar',      Views.SuiteProgressBar, '#transition-runner-progress-bar');
    addView('controls',         Views.Controls,         '#transition-runner-controls');
    addView('settings',         Views.Settings,         '#transition-runner-settings-modal-container');
    addView('currentTestState', Views.CurrentTestState, '#transition-runner-current-test-state');
    Backbone.history.start();
  };


  //Transition.buildRunner();
}.call(this));
