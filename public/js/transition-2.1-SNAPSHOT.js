/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, sprintf */
"use strict";

/********************************************************************************
 * Transition.js
 * Version: 2.1-SNAPSHOT
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
      models: {},
      KEYS: {
        ESC: 27
      },
      suiteRunning: false
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
    StateReport,
    SuiteDropdown,
    TestRunner,
    Log = Transition.Log,
    models = Transition.models;

  root.Transition = Transition;
  Transition.$    = root.jQuery;
  Transition.Views.Bootstrap = {};

  if (!Transition.$) {
    throw 'Error: jQuery not found.';
  }

  Transition.loadSuiteContent = function () {
    $.ajax({
      async:     false,
      url:       '../test-suite.html',
      dataType:  'html',
      success:   function (data) {
        $('body').append(data);
      },
      error:      function (jqXHR, textStatus, errorThrown) {
        Transition.lastError = errorThrown;
        Log.info("No Custom HTML Content for Test Suite (../test-suite.html)");
      }
    });
  };

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
      'frame-divider-upper-pct': 50,
      'frame-divider-lower-pct': 50,
      sortByLastModified:        true,
      perStateTimeout:           20 * 1000,
      testTimeout:               45 * 1000,
      suiteTimeout:              200 * 1000,
      // NB: hook this into the UI
      maxTransitions:            20,
      maxAttemptsPerState:       50,
      // NB: hook this into the UI
      //pollTimeout:     250,
      pollTimeout:               500,
      // NB: hook this into the UI
      logLevel:                  Log.Levels.TRACE
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

      if (!this.get('attrs')) {
        this.set('attrs', {});
      }
    },

    callOnEnter: function (test, args) {
      var onEnter = this.get('onEnter'), fnName = 'function';

      if (typeof onEnter !== "function") {
        fnName = onEnter;
        onEnter = test.get(onEnter);
      }

      if (typeof onEnter !== "function") {
        throw 'Error: onEnter[' + this.get('onEnter') + '] is not a valid function';
      }

      try {
        Log.trace("calling onEnter trigger %s.%s", this.get('name'), fnName);
        onEnter.call(test, args);
      }
      catch (e) {
        console.log("Error calling onEnter trigger %o.%o", this.get('name'), fnName, e);
        Log.error("Error calling onEnter trigger %s.%s", this.get('name'), fnName, e);
      }
    },

    to: function (targetStateName, predicate) {
      var info = {
          to:   targetStateName,
          pred: predicate
        },
        transitions = this.get('transitions') || [];
      transitions.push(info);
      this.set('transitions', transitions);
      return this;
    },

    when: function (predicate) {
      var transitions = this.get('transitions');
      transitions[transitions.length - 1].pred = predicate;
      return this;
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
      var firstState, lastState, transitions, failureState;
      this.set('name', attributes.name || '**no test name**');
      this.set('initialize', attributes.initialize || Transition.noop);
      this.set('states', new TestStates());
      this.get('states').reset(attributes.states || []);

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
          attrs:   {
            start:   true,
            success: true,
            failure: false
          },
          transitions: {}
        });
        this.get('states').add(this.successState);
      }

      // create a default failure state, ok if not reachable
      failureState = this.getState('failure');
      if (!failureState) {
        failureState = new TestState({
          name:    'failure',
          onEnter: Transition.noop,
          attrs:   {
            start:   false,
            success: false,
            failure: true
          },
          transitions: {}
        });
        this.get('states').add(failureState);
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
      var res;
      _.each(this.get('states').models, function (st) {
        if (st.get('name') === name) {
          res = st;
        }
      });
      return res;
    },

    find: function () {
      return Transition.find.apply(Transition, arguments);
    },

    elementExists:  function () {
      return Transition.elementExists.apply(Transition, arguments);
    },

    elementNotExists:  function () {
      return Transition.elementNotExists.apply(Transition, arguments);
    },

    navigateTo:  function () {
      return Transition.navigateTo.apply(Transition, arguments);
    }

  });

  Models.TestSuite = TestSuite = Backbone.Collection.extend({
    model: Test
  });

  Models.SuiteRunner = SuiteRunner = Backbone.Model.extend({
    defaults: {
      currentTest: new Test({}),
      total:       0,
      numPassed:   0,
      numFailed:   0,
      failedTests: []
    },

    initialize: function (ourModels, options) {
      models.suite.on('add', this.trackCurrentTest, this);
      this.set('startTime', new Date());
    },

    trackCurrentTest: function (test) {
      this.set('currentTest', test);
      models.suite.off('add', this.trackCurrentTest, this);
    },

    elapsedTime: function () {
      return (new Date()).getTime() - this.get('startTime').getTime();
    },

    nextTest: function () {
      var test = this.get('queue').shift();
      if (test) {
        this.set('currentTest', test);
        this.trigger('change:queue');
        return true;
      }

      return false;

    },

    percentRemaining: function () {
      var testsRun, totalTests, pct;

      if (!this.get('total')) {
        return 100.0;
      }

      totalTests = this.get('total');
      testsRun   = totalTests - this.get('numPassed') - this.get('numFailed');
      pct = 100.0 * (testsRun / totalTests);

      return pct;
    },

    percentPassed: function () {
      return 100.0 * this.get('numPassed') / this.get('total');
    },

    percentFailed: function () {
      return 100.0 * this.get('numFailed') / this.get('total');
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
      // ERROR and FATAL
      return 'label-important';
    },

    levelDescription: function () {
      var level = this.get('level');
      if (Log.Levels.TRACE === level) {
        return 'TRACE';
      }

      if (Log.Levels.DEBUG === level) {
        return 'DEBUG';
      }

      if (Log.Levels.INFO === level) {
        return 'INFO';
      }

      if (Log.Levels.WARN === level) {
        return 'WARN';
      }

      if (Log.Levels.ERROR === level) {
        return 'ERROR';
      }

      if (Log.Levels.FATAL === level) {
        return 'FATAL';
      }
    }

  });

  Models.LogEntries = LogEntries = Backbone.Collection.extend({
    model: LogEntry,

    first: function () {
      if (this.models.length > 0) {
        return this.models[0];
      }
      return null;
    },

    last: function () {
      if (this.models.length > 0) {
        return this.models[this.models.length - 1];
      }
      return null;
    }
  });

  Models.StateReport = StateReport = Backbone.Model.extend({
    defaults: {
      startTime: null,
      endTime:   null,
      state:     null,
      passed:    null,
      checks:    1
    },

    initialize: function (attributes) {
      this.set('state', attributes.state);
      this.set('startTime', new Date());
    },

    elapsedTime: function () {
      return (new Date()).getTime() - this.get('startTime').getTime();
    }

  });

  Models.TestRunner = TestRunner = Backbone.Model.extend({
    initialize: function (attributes) {
      this.set('test',            attributes.test);
      this.set('currStateNumber', 0);
      this.set('state',           attributes.test.getState('start'));
      this.set('visited',         []);
      //this.set('failedTests',     []);
    },

    visited: function (name) {
      var a = this.get('visited');
      a.unshift(name);
      this.set('visited', a);
      return this;
    },

    start: function () {
      this.set('isRunning', true);
      this.set('startTime', new Date());
      this.set('stateReport', new StateReport({
        state: this.get('state')
      }));
      this.set('currStateNumber', 1);
      this.visited(this.get('state').get('name'));
      try {
        this.get('test').get('initialize').call(this.get('state'));
        this.get('state').callOnEnter(this.get('test'), this.get('state'));
      }
      catch (e) {
        console.error('Error initialzing test or calling onEnter!');
        console.error(e);
        this.set('error', e);
        Log.error(e);
      }
    },

    transition: function () {
      var dests = [],
          test  = this.get('test'),
          state = this.get('state'),
          error,
          self = this,
          toStatesTried = [];

      if (state.get('attrs').success || state.get('attrs').failure) {
        this.set('isDone', true);
        this.set('elapsedTime', this.elapsedTime());
        this.set('isRunning', false);
        this.set('succeeded', this.succeeded());
        return;
      }

      _.each(state.get('transitions'), function (tr) {
        var pred = tr.pred, predName = tr.pred, pfn;
        toStatesTried.push(tr.to);

        if (typeof pred === "undefined") {
          self.fail();
          error = sprintf("Error: no predicate defined (or was null) for test %s/%s", test.get('name'), state.get('name'));
          self.set('error', error);
          Log.error(error);
          return;
        }

        if (typeof pred !== "function" && typeof pred !== "undefined") {
          // allow transition predicates to start with a '!' to allow the
          // expression of logical negation, iow 'NOT predicate'.
          if (pred.toString().indexOf("!") === 0) {
            predName = pred.toString().substring(1);
            pfn      = test.attributes[predName];
            if ( typeof pfn === "undefined") {
              // treat as a jquery selector
              pred = Transition.elementNotExists_(predName);
            }
            else {
              // it's a function on the class
              pred     = function (state, tr) {
                return !pfn.call(this, state, tr);
              };
            }
          }
          else {
            predName = pred.toString();
            pfn = test.attributes[predName];
            if ( typeof pfn === "undefined") {
              // treat as a jquery selector
              pred = Transition.elementExists_(predName);
            }
            else {
                // it's a function on the class
                pred     = function (state, tr) {
                    return pfn.call(this, state, tr);
                };
            }
          }
        }

        if (typeof pred !== "function") {
          self.fail();
          error = sprintf("Error: predicate for test %s/%s not found/recognized: %s", test.get('name'), state.get('name'), predName);
          self.set('error', error);
          Log.error(error);
          throw sprintf(error);
        }

        try {
          if (pred.call(test, state, tr)) {
            dests.push(tr);
          }
        }
        catch (e) {
          console.log(e);
        }
      });

      if (dests.length > 1) {
        this.fail();
        error = "Error: more than 1 transition out of " + this.get('state').get('name') + " :" + JSON.stringify(dests);
        this.set('error', error);
        Log.error(error);
        return;
      }

      if (dests.length === 1) {
        // NB: this is nearly identical to part of stepBack below
        state.set('endTime', new Date());
        Log.info("Transitioning from " + state.get('name') + " to " + dests[0].to);
        this.set('currStateNumber', 1 + this.get('currStateNumber'));
        state = test.getState(dests[0].to);
        this.set('state', state);
        this.visited(this.get('state').get('name'));
        try {
          state.callOnEnter(test, dests[0]);
        }
        catch (e) {
          this.set('error', e);
          Log.error("Error calling on-enter trigger for: %s : %s<pre>%s</pre>", this.get('name'), e.message, e.stack);
          console.error(e);
          console.log(e.message);
          console.log(e.stack);
        }

        return true;
      }

      Log.trace("No transition out of " + state.get('name') + " yet, could not go to any of: %a", toStatesTried);

      return false;
    },

    stepBack: function () {
      var test  = this.get('test'),
          state = this.get('state'),
          visited = this.get('visited'),
          prev;

      if (visited.length < 2) {
        return this;
      }

      prev = visited.shift();
      this.set('visited', visited);

      // NB: this is nearly identical to part of transition above
      state.set('endTime', new Date());
      Log.info('rewinding from %s to %s', prev, visited[0]);
      this.set('currStateNumber', 1 + this.get('currStateNumber'));
      state = test.getState(prev);
      this.set('state', state);
      try {
        // NB: there is predicate map to pass when we're stepping back...
        state.callOnEnter(test);
      }
      catch (e) {
        console.error(e);
        this.set('error', e);
        Log.error(e);
      }

    },

    elapsedTime: function () {
      return (new Date()).getTime() - (this.get('startTime') || new Date()).getTime();
    },

    percentTimeRemaining: function () {
      var d = models.settings.get('testTimeout');
      if (this.elapsedTime() < 10) {
        return 100.0;
      }
      return 100.0 * ((d - this.elapsedTime()) / d);
    },

    percentTimeElapsed: function () {
      return 100.0 * (this.elapsedTime() / models.settings.get('testTimeout'));
    },

    fail: function () {
      var failedTests = models.suiteRunner.get('failedTests');
      console.log('*** ADDED A FAILED TEST TO THE LOG ***'); 
      if (failedTests[failedTests.length-1] != this.get('test')) {
        models.suiteRunner.get('failedTests').push(this.get('test'));
      }
      this.trigger('change');
      var state = this.get('test').getState('failure');
      this.set('state', state);
      this.set('isDone', true);
      this.set('elapsedTime', this.elapsedTime());
      this.set('isRunning', false);
      this.set('succeeded', this.succeeded());
      this.set('testFinished', true);
    },

    succeeded: function () {
      return this.get('isDone') &&
             this.get('state').get('attrs').success;
    },

    labelClass: function () {
      if (this.get('isRunning')) {
        return 'label-info';
      }

      if (this.get('isDone') && this.succeeded()) {
        return 'label-success';
      }

      if (this.get('isDone') && !this.succeeded()) {
        return 'label-important';
      }

      return '';
    }

  });

  /********************************************************************************
   * Views
   *
   ********************************************************************************/
  Views.Bootstrap.Navbar = Backbone.View.extend({
    templateId: 'navbar-tmpl',

    events: {
      'click a.dropdown-toggle':  'toggleDropdownMenu',
      'click .dropdown-menu a':   'menuItemClicked',
      'keyup':                    'checkIfEscapePressed',
      'click a':                  'buttonClicked'
    },

    menuItemClicked: function (evt) {
      var target = $(evt.target),
          item = target.attr('data-item'),
          handler = item + 'Clicked';

      this.closeAllMenus();

      if (this[handler]) {
        evt.preventDefault();
        return this[handler](evt);
      }

      if (this[item]) {
        evt.preventDefault();
        return this[item](evt);
      }

    },

    buttonClicked: function (evt) {
      var target = $(evt.target),
          item = target.attr('data-item'),
          handler = item + 'Clicked';


      if (this[handler]) {
        evt.preventDefault();
        return this[handler](evt);
      }

      if (this[item]) {
        evt.preventDefault();
        return this[item](evt);
      }

    },

    closeAllMenus: function () {
      this.$el.find('.dropdown').removeClass('open');
    },

    toggleDropdownMenu: function (evt) {
      var target = $(evt.target),
          li = target.parent('li');

      evt.preventDefault();

      if (li.hasClass('open')) {
        li.removeClass('open');
        return;
      }

      this.closeAllMenus();
      li.addClass('open');
      return this;
    },

    checkIfEscapePressed: function (evt) {
      if (evt.keyCode === Transition.KEYS.ESC) {
        evt.preventDefault();
        return this.closeAllMenus();
      }
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {suite: models.suite}));
      return this;
    }
  });

  Views.Navbar = Views.Bootstrap.Navbar.extend({
    templateId: 'navbar-tmpl',

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      _.extend(this.events, {
        'change input[name=log-filter]':    'filterLog',
        'keyup input[name=log-filter]':     'filterLog',
        'change input[name=suite-filter]':  'filterSuite',
        'keyup input[name=suite-filter]':   'filterSuite',
        'click #hideShowControls': 'toggleControls'
      });
      _.bindAll(this, 'showSettings');
      models.suite.on('all', this.render, this);
      models.settings.on('change', this.render, this);
    },

    remove: function () {
      models.suite.off('all', this.render);
      models.settings.off('change', this.render, this);
      this.$el.remove();
    },

    toggleControls: function () {
      Transition.toggleControls();
    },

    showSettings: function () {
      Transition.views.settings.display();
    },

    testSelected: function (evt) {
      var dest = $(evt.target).attr('href');
      Transition.router.navigate(dest, {trigger: true});
    },

    clearLog: function () {
      models.logEntries.reset([]);
    },

    filterLog: function (evt) {
      var str = $(evt.target).val();
      Transition.views.logViewer.filter(str);
    },

    setLogTrace: function () {
      models.settings.set('logLevel', Log.Levels.TRACE);
    },

    setLogDebug: function () {
      models.settings.set('logLevel', Log.Levels.DEBUG);
    },

    setLogInfo: function () {
      models.settings.set('logLevel', Log.Levels.INFO);
    },

    setLogWarn: function () {
      models.settings.set('logLevel', Log.Levels.WARN);
    },

    setLogError: function () {
      models.settings.set('logLevel', Log.Levels.ERROR);
    },

    setLogFatal: function () {
      models.settings.set('logLevel', Log.Levels.FATAL);
    },

    reloadClicked: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      Transition.reload();
    },

    filterSuite: function (evt) {
      var str = $(evt.target).val();
      this.$el.find('#suite-dropdown-divider ~ li').remove();
      this.suiteDropdown.setFilter(str);
      this.suiteDropdown.render().$el.appendTo(this.$el.find('.dropdown-menu'));
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {suite: models.suite}));
      this.suiteDropdown = new SuiteDropdown();
      this.suiteDropdown.render().$el.appendTo(this.$el.find('.test-suite-dropdown'));
      return this;
    }
  });

  Views.SuiteDropdown = SuiteDropdown = Backbone.View.extend({
    templateId: 'suite-dropdown-tmpl',

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      models.suite.on('change', this.render, this);
    },

    setFilter: function (filterBy) {
      this.filterBy = filterBy;
    },

    testsToShow: function () {
      var self = this;
      if (!self.filterBy || self.filterBy.length < 1) {
        return models.suite.models;
      }
      return _.filter(models.suite.models, function (test) {
        return -1 !== test.get('name').toLowerCase().indexOf(self.filterBy.toLowerCase());
      });
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, this));
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
      'click button[name=back]':     'backClicked',
      'click button[name=continue]': 'continueClicked',
      'click button[name=reload]':   'reloadClicked'
    },

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      _.bindAll(this, 'runClicked');
      _.bindAll(this, 'stopClicked');
      _.bindAll(this, 'stepClicked');
      _.bindAll(this, 'backClicked');
      _.bindAll(this, 'continueClicked');
      _.bindAll(this, 'reloadClicked');
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

    backClicked: function () {
      Transition.back();
    },

    continueClicked: function () {
      Transition.cont();
    },

    reloadClicked: function () {
      Transition.reload();
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

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
      models.suiteRunner.on('change', this.update, this);
    },

    update: function () {
      this.$el.html(tmpl(this.templateId, {}));
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {}));
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

    initialize: function (options) {
      this.constructor.__super__.initialize.apply(this, []);
      options = options || {};
      this.testRunner = options.testRunner || new TestRunner({
        test: new Test({name: 'none'})
      });
      this.testRunner.on('change', this.render, this);
      models.settings.on('change', this.render, this);
    },

    remove: function () {
      this.testRunner.off('change', this.render, this);
      models.settings.off('change', this.render, this);
      this.$el.remove();
    },

    render: function () {
      this.$el.html(tmpl(this.templateId, {
        test:   this.testRunner.get('test'),
        runner: this.testRunner
      }));
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
      this.filterBy = null;
    },

    removeLogEntry: function (logEntry) {
      console.log('LogViewer.removeLogEntry');
    },

    addLogEntry: function (logEntry) {
      var entryView;

      if (logEntry.get('level') > models.settings.get('logLevel')) {
        return;
      }

      entryView = new LogEntryView({logEntry: logEntry});
      entryView.render();
      this.entryViews[logEntry.cid] = entryView;

      if (this.passesFilter(logEntry)) {
        this.$el.prepend(entryView.$el);
      }
    },

    passesFilter: function (logEntry) {
      if (!this.filterBy) {
        return true;
      }

      if (logEntry.get("message").toLowerCase().indexOf(this.filterBy.toLowerCase()) !== -1) {
        return true;
      }

      if (logEntry.get("slevel").toLowerCase().indexOf(this.filterBy.toLowerCase()) !== -1) {
        return true;
      }

      return false;
    },

    filter: function (filterBy) {
      this.filterBy = filterBy;
      this.render();
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
    if (Transition.views[name]) {
      Transition.views[name].remove();
    }
    Transition.views[name] = view;
    view.render(rdata);
    view.$el.appendTo(appendToSelector);
    return view;
  };

  Transition.pollFn = function () {
    // stop if we've exceeded the testTimeout
    // or if we've extend the maxTransitions
    // or if we've extend the maxAttemptsPerState
    if (Transition.testRunner.get('isDone')) {
      Log.info('Test completed!');
      Transition.testRunner.set('testFinished', true);
      return;
    }

    if (Transition.testRunner.elapsedTime() >= (Transition.testRunner.get('test').get('testTimeout') || models.settings.get('testTimeout'))) {
      Log.fatal('Test timed out at ' + ((Transition.testRunner.get('test').get('testTimeout') || models.settings.get('testTimeout')) / 1000) + ' seconds');
      Transition.testRunner.fail();
      return;
    }

    // NB: protect against transition predicates or init functions from
    // throwing exceptions, it breaks the state machine / framework
    Transition.testRunner.transition();
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  Transition.runSuite = function () {
    Transition.suiteRunning = true;
    models.suiteRunner.set('failedTests', []);
    models.suiteRunner.set('suiteStarted', true);
    models.suiteRunner.set('numPassed', 0);
    models.suiteRunner.set('numFailed', 0);
    models.suiteRunner.set('queue', new TestSuite(models.suite.models));
    models.suiteRunner.set('total', models.suite.models.length);
    models.suiteRunner.set('stopSuite', false);
    models.suiteRunner.nextTest();
    models.suiteRunner.set('startTime', new Date());
    Transition.runTest();

    Transition.suitePollFn = function () {
      var currTest;
      if (models.suiteRunner.get('stopSuite')) {
        Log.error('Suite halted.');
        Transition.suiteRunning = false;
        models.suiteRunner.set('suiteFinished', true);
        return;
      }

      if (models.suiteRunner.elapsedTime() >= models.settings.get('suiteTimeout')) {
        Log.fatal('Suite timed out at ' + (models.settings.get('suiteTimeout') / 1000) + ' seconds');
        Transition.stop();
        Transition.testRunner.fail();
        models.suiteRunner.set('numFailed', 1 + models.suiteRunner.get('numFailed'));
        Transition.suiteRunning = false;
        models.suiteRunner.set('suiteFinished', true);
        return;
      }
      else {
        console.log('Suite has not yet timed out after ' + models.suiteRunner.elapsedTime() + ' < ' + (models.settings.get('suiteTimeout')));
      }

      if (Transition.testRunner.elapsedTime() >= models.settings.get('testTimeout')) {
        Log.fatal('Test timed out at ' + (models.settings.get('testTimeout') / 1000) + ' seconds');
        //NB: Mark current test as failed
        models.suiteRunner.set('numFailed', 1 + models.suiteRunner.get('numFailed'));
        Transition.testRunner.fail();

        if (models.suiteRunner.nextTest()) {
          Transition.runTest();
          Transition.suitePollTimeoutId = setTimeout(Transition.suitePollFn, models.settings.get('pollTimeout'));
          return;
        }

        Log.info('Suite Completed');
        Transition.suiteRunning = false;
        models.suiteRunner.set('suiteFinished', true);

        // Log out which tests failed (if any):
        if (models.suiteRunner.get('failedTests').length > 0) {
          var failedTests = models.suiteRunner.get('failedTests');
          for (var i = 0; i < failedTests.length; i++) {
            Log.error(' --> ' + failedTests[i].attributes.name);
          }
          Log.error('\n\nThe following tests failed:');
        }

        return;
      }

      if (Transition.testRunner.get('isDone')) {
        clearTimeout(Transition.pollTimeoutId);

        if (Transition.testRunner.succeeded()) {
          models.suiteRunner.set('numPassed', 1 + models.suiteRunner.get('numPassed'));
          Log.info('PASSED: %s', Transition.testRunner.get('test').get('name'));
        }
        else {
          models.suiteRunner.set('numFailed', 1 + models.suiteRunner.get('numFailed'));
          Log.error('FAILED: %s', Transition.testRunner.get('test').get('name'));
        }

        if (models.suiteRunner.nextTest()) {
          Transition.runTest();
          Transition.suitePollTimeoutId = setTimeout(Transition.suitePollFn, models.settings.get('pollTimeout'));
          return;
        }

        Log.info('Suite Completed');
        Transition.suiteRunning = false;
        models.suiteRunner.set('suiteFinished', true);

        return;
      }

      Transition.suitePollTimeoutId = setTimeout(Transition.suitePollFn, models.settings.get('pollTimeout'));
    };

    // schedule the first poll
    Transition.suitePollTimeoutId = setTimeout(Transition.suitePollFn, models.settings.get('pollTimeout'));
  };

  Transition.initTestRunner = function () {
    var test = models.suiteRunner.get('currentTest');
    Transition.testRunner = new TestRunner({
      test: test
    });

    addView('currentTestState', Views.CurrentTestState, '#transition-runner-current-test-state', {
      testRunner: Transition.testRunner
    });

    Log.info('START: ' + test.get('name'));
    Transition.testRunner.start();
    // NB: this should no longer be necessary
    // test.set('currentState', test.getState('start'));
  };

  Transition.runTest = function () {
    Transition.initTestRunner();
    Transition.testRunner.set('testFinished', false);
    Transition.testRunner.set('testStarted', true);
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  Transition.stop = function () {
    clearTimeout(Transition.pollTimeoutId);
    Transition.pollTimeoutId = null;
    models.suiteRunner.set('stopSuite', true);
  };

  Transition.step = function () {

    if (Transition.testRunner && Transition.testRunner.get('isDone')) {
      Log.info('Test Completed');
      Transition.testRunner = null;
      return;
    }

    if (!Transition.testRunner || !Transition.testRunner.get('isRunning')) {
      Transition.initTestRunner();
    }

    Transition.testRunner.transition();
  };

  Transition.back = function () {
    if (!Transition.testRunner) {
      Log.warn("Can't step back, no test is running.");
      return;
    }

    Transition.testRunner.stepBack();
  };

  Transition.reload = function () {
    Transition.loadScript('../test-suite.js');
    if (Transition.testRunner && Transition.testRunner.get('test').get('url')) {
      Transition.loadScript(Transition.testRunner.get('test').get('url'));
    }
  };

  Transition.cont = function () {
    Transition.pollTimeoutId = setTimeout(
        Transition.pollFn,
        models.settings.get('pollTimeout')
    );
  };

  /********************************************************************************
   * Test Suite Management and Helpers
   *
   ********************************************************************************/
  Transition.loadScript = function () {
    var url, option;
    url = arguments[0];
    if (arguments.length > 1) {
      option = arguments[1];
    }
    if ( ((option === "no-ci") && (Transition.models.suiteRunner.get('runningPhantom'))) || (option === "pending") ) {
      console.log('Note: the following test was marked as pending: ' + url);
    } else {
      var testCount = Transition.models.suite.size(), lastModified, test;
      $.ajax({
        url:      url,
        dataType: "script",
        async:    false,
        complete: function (jqXHR, textStatus) {
          Transition.x = jqXHR;
          if (Transition.models.suite.size() > testCount) {
            lastModified = new Date(jqXHR.getResponseHeader('Last-Modified'));
            test = _.last(models.suite.models);
            test.set('url', url);
            test.set('ciCompatible', true);
            test.set('lastModified', lastModified);
            test.set('lastModifiedTime', lastModified.getTime());
          }
        },
        error:    function (jqXHR, textStatus, errorThrown) {
          Transition.lastError = errorThrown;
          Log.error("Error loading script[%s] %s<pre>%s</pre>", url, errorThrown.message, errorThrown.stack);
          console.log('jqXHR: %o', jqXHR);
          console.log('textStatus: %o', textStatus);
          console.log('errorThrown: %o', errorThrown);
          console.log('errorThrown: %o', errorThrown.stack);
        }
      });
    }
  };

  /*
  Transition.loadScript = function (url) {
    var testCount = Transition.models.suite.size(), lastModified, test;
    $.ajax({
      url:      url,
      dataType: "script",
      async:    false,
      complete: function (jqXHR, textStatus) {
        Transition.x = jqXHR;
        if (Transition.models.suite.size() > testCount) {
          lastModified = new Date(jqXHR.getResponseHeader('Last-Modified'));
          test = _.last(models.suite.models);
          test.set('lastModified', lastModified);
          test.set('lastModifiedTime', lastModified.getTime());
        }
      },
      error:    function (jqXHR, textStatus, errorThrown) {
        Transition.lastError = errorThrown;
        Log.error("Error loading script[%s] %s<pre>%s</pre>", url, errorThrown.message, errorThrown.stack);
        console.log('jqXHR: %o', jqXHR);
        console.log('textStatus: %o', textStatus);
        console.log('errorThrown: %o', errorThrown);
        console.log('errorThrown: %o', errorThrown.stack);
      }
    });
  };
  */

  Transition.newState = function () {
    var args = [].slice.call(arguments),
        stateName = args.shift(),
        onEnter   = args.shift() || Transition.noop,
        attrs     = args.shift() || {},
        state = new TestState({
      name:        stateName,
      onEnter:     onEnter,
      attrs:       attrs,
      transitions: args || []
    });
    return state;
  };

  Transition.addTest = function (options) {
    try {
      var test = new Test(options),
          existing = models.suite.find(function (t) {
            return t.get('name') === test.get('name');
          });

      _.each(options, function (param, name) {
        if (typeof param === "function") {
          test[name] = _.bind(param, test);
        }
      });

      if (existing) {
        Log.info("Replacing test in suite: '%s'", test.get('name'));
        existing.set(test.toJSON());
        return this;
      }

      models.suite.add(test);
      return this;
    }
    catch (e) {
      Log.error("Error registering test: %s : %s<pre>%s</pre>", options.name, e.message, e.stack);
      console.error(e);
      console.log(e.message);
      console.log(e.stack);
    }
  };

  Transition.noop = function () {
  };

  Transition.constantly_ = function (val) {
    return function () {
      return val;
    };
  };

  Transition.find = function (selector) {
    try {
      var jq = parent.frames.main.jQuery || parent.frames.main.document.jQuery || parent.frames.main.window.jQuery || $(parent.frames.main.document),
          result = jq(selector);
      return result;
    }
    catch(e) {
      console.log(e);
    }
  };

  Transition.elementExists = function (selector) {
    var result = Transition.find(selector);
    return result && result.length > 0;
  };

  Transition.elementExists_ = function (selector) {
    return function () {
      return Transition.elementExists(selector);
    };
  };

  Transition.elementNotExists = function (selector) {
    var result = Transition.find(selector);
    return result.length === 0;
  };

  Transition.elementNotExists_ = function (selector) {
    return function () {
      return Transition.elementNotExists(selector);
    };
  };

  Transition.click = function (selector) {
    var nodes = Transition.find(selector);
    nodes.click();
    return nodes;
  };

  Transition.click_ = function (selector) {
    return function () {
      var nodes = Transition.find(selector);
      nodes.click();
      return nodes;
    };
  };

  Transition.clickAfter = function (selector, ms) {
    var nodes = Transition.find(selector);
    setTimeout(nodes.click, ms);
    return nodes;
  };

  Transition.clickAfter_ = function (selector) {
    return function () {
      var nodes = Transition.find(selector);
      setTimeout(nodes.click, ms);
      return nodes;
    };
  };

  Transition.navigateTo = function (url) {
    if (url.indexOf("#") === 0) {
      parent.frames.main.window.location.hash = url;
      return url;
    }

    return parent.main.window.location.href = url;
  };

  Transition.navigateTo_ = function (url) {
    return function () {
      return Transition.navigateTo(url);
    };
  };

  Transition.isChecked = function (selector) {
    return Transition.find(selector).is(':checked');
  };

  Transition.isChecked_ = function (selector) {
    return function () {
      return Transition.isChecked(selector);
    };
  };

  Transition.isNotChecked = function (selector) {
    var elt = Transition.find(selector);
    // false if no element found
    if (elt.length < 1) {
      return false;
    }
    return !elt.is(':checked');
  };

  Transition.isNotChecked_ = function (selector) {
    return function () {
      return Transition.isNotChecked(selector);
    };
  };

  Transition.clickAnchor = function (selector) {
    var elt = Transition.find(selector);
    return Transition.navigateTo(elt.first().attr('href'));
  };

  Transition.clickAnchor_ = function (selector) {
    return function () {
      return Transition.clickAnchor(selector);
    };
  };

  Transition.fillInWithKeyEvents = function (selector, text) {
    var ii, e, e2,
        el = Transition.find(selector);

    for (ii = 0; ii < text.length; ii += 1) {
      e  = $.Event("keyup");
      e2 = $.Event("keydown");
      e.which = text.charCodeAt(ii);
      el.val(el.val() + text.charAt(ii));
      el.trigger(e);
      el.trigger(e2);
    }
    el.change();
  };

  Transition.findVisibleText = function (text) {
    return Transition.find("*contains(" + text + "):visible:last");
  };

  Transition.findVisibleText_ = function(text) {
    return function() {
      return Transition.findVisibleText(text);
    };
  };

  /**
   * Sets the location of the frame divider between the main frame and the test
   * frame.
   */
  Transition.setFrameDivider = function (upper, lower) {
    if (typeof lower === "undefined") {
      lower = 100 - upper;
      lower = Math.floor(lower);
    }
    
    models.settings.set('frame-divider-upper-pct', upper);
    models.settings.set('frame-divider-lower-pct', lower);
    parent.frames.document.getElementsByTagName('frameset')[0].rows = upper + "%," + lower + "%";
  };

  Transition.hideControls = function () {
    parent.frames.document.getElementsByTagName('frameset')[0].rows = "*,50px";

  };

  Transition.showControls = function () {
    parent.frames.document.getElementsByTagName('frameset')[0].rows = models.settings.get('frame-divider-upper-pct') + "%," + models.settings.get('frame-divider-lower-pct') + "%";
  };

  Transition.toggleControls = function () {
    var elt = $('a#hideShowControls'),
        text = elt.text();
    if ('Hide' === text) {
      elt.text('Show');
      Transition.hideControls();
      return;
    }

    elt.text('Hide');
    Transition.showControls();
  };

  /********************************************************************************
   * Logging
   *
   ********************************************************************************/
  Transition.Log.newEntry = function (slevel, level, args) {
    var message, entry;
    args[0] = args[0] + '';
    message = sprintf.apply(sprintf, args);
    entry = new LogEntry({
      slevel:      slevel,
      level:       level,
      testName:    models.suiteRunner.get('currentTest'),
      testState:   models.suiteRunner.get('currentTest').get('currentState'),
      timestamp:   '*test state*',
      repeatCount: 1,
      message:     message
    });

    if (level > models.settings.get('logLevel')) {
      return;
    }

    if (models.logEntries.models.length > 0 &&
        models.logEntries.last().get('message') === entry.get('message')) {
      models.logEntries.last().countRepeat();
      return models.logEntries.last();
    }

    models.logEntries.add(entry);
    return entry;
  };

  Transition.Log.trace = function () {
    Transition.Log.newEntry.call(Transition, 'TRACE', Log.Levels.TRACE, arguments);
  };

  Transition.Log.debug = function () {
    Transition.Log.newEntry.call(Transition, 'DEBUG', Log.Levels.DEBUG, arguments);
  };

  Transition.Log.info = function () {
    Transition.Log.newEntry.call(Transition, 'INFO', Log.Levels.INFO, arguments);
  };

  Transition.Log.warn = function () {
    Transition.Log.newEntry.call(Transition, 'WARN', Log.Levels.WARN, arguments);
  };

  Transition.Log.error = function () {
    Transition.Log.newEntry.call(Transition, 'ERROR', Log.Levels.ERROR, arguments);
  };

  Transition.Log.fatal = function () {
    Transition.Log.newEntry.call(Transition, 'FATAL', Log.Levels.FATAL, arguments);
  };

  Transition.Log.isTrace = function () {
    return models.settings.get('logLevel') === Log.Levels.TRACE;
  };

  Transition.Log.isDebug = function () {
    return models.settings.get('logLevel') === Log.Levels.DEBUG;
  };

  Transition.Log.isInfo = function () {
    return models.settings.get('logLevel') === Log.Levels.INFO;
  };

  Transition.Log.isWarn = function () {
    return models.settings.get('logLevel') === Log.Levels.WARN;
  };

  Transition.Log.isError = function () {
    return models.settings.get('logLevel') === Log.Levels.ERROR;
  };

  Transition.Log.isFatal = function () {
    return models.settings.get('logLevel') === Log.Levels.FATAL;
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

      Transition.testRunner = new TestRunner({
        test: models.suiteRunner.get('currentTest')
      });

      addView('currentTestState', Views.CurrentTestState, '#transition-runner-current-test-state', {
        testRunner: Transition.testRunner
      });

    },

    main: function () {
      // set the default selected test here?
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
    //Transition.LocalStorage.initialize();

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
    Log.info('runner initialization completed');
    if (models.suite.models.length < 1) {
      Log.fatal('No Test Suite Found, please place your tests in <a href="../test-suite.js">../test-suite.js</a>');
    }


    if (parent.window.location.search.indexOf('autoStartSuite=true') !== -1) {
      Transition.toggleControls();
      Transition.runSuite();
    }

    if (models.settings.get('sortByLastModified')) {
      Log.trace('sortByLastModified');
      models.suite.comparator = function (m) {
        // multiplying by -1 will make the latest modified the first in the list
        return -1 * m.get('lastModifiedTime');
      };
      models.suite.sort();

      models.suiteRunner.trackCurrentTest(_.first(models.suite.models));
    }

    Log.info('Ready: there are %s tests in the suite.', models.suite.models.length);

  };

  Transition.loadSuiteContent();

}.call(this));
