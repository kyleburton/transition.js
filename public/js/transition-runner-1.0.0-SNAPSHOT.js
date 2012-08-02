/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, Transition, $ */
"use strict";

Transition.Runner = Transition.Runner || (function () {
  var self = {tests: [], testsByName: {}, callbacks: {}};

  self.addTests = function () {
    var ii;
    for (ii = 0; ii < arguments.length; ii += 1) {
      self.addTest(arguments[ii]);
    }
  };

  self.addTest = function (cfg) {
    if (!cfg.name) {
      Transition.raise("Error: configuration has no name (required): " + JSON.stringify(cfg));
    }

    if (!cfg.uri) {
      Transition.raise("Error: configuration has no uri (required): " + JSON.stringify(cfg));
    }

    if (self.testsByName[cfg.name]) {
      Transition.raise("Error: test alreay exists with that name: " + JSON.stringify(cfg));
    }

    self.testsByName[cfg.name] = cfg;
    self.tests.push(cfg);
  };

  self.currentTest = function () {
    var name = $('#registered-tests').val(),
        cfg  = self.testsByName[name];

    if (!cfg) {
      Transition.raise("Error: no registered test with name: " + name);
    }

    return cfg;
  };

  self.testSelected = function (e) {
    if (e) {
      e.preventDefault();
    }

    Transition.Stm.reset();
    self.loadScript(self.currentTest().uri);
    //$.getScript(self.currentTest().uri);
    Transition.log('Loaded ' + self.currentTest().name + ' from ' + self.currentTest().uri);
    return false;
  };

  self.reloadCurrentTest = function (e) {
    var savedState;
    if (e) {
      e.preventDefault();
    }

    savedState = Transition.Stm.captureStmState();
    self.testSelected();
    Transition.Stm.restoreStmState(savedState);
    return false;
  };

  self.scriptLoadErrorFn = function (url) {
    return function (jqXhr, textStatus, errorThrown) {
      console.log('Error while fetching url: ' + url);
      console.log('ajax textStatus: ' + textStatus);
      console.log('Error object available in Transition.lastError');
      console.error(errorThrown);
      Transition.lastError = errorThrown;
    };
  };

  self.loadScript = function (url) {
    $.ajax({
      url:      url,
      dataType: "script",
      async:    false,
      error:    self.scriptLoadErrorFn(url)
    });
  };

  self.runNextTest = function (e) {
    var totalTestsRun = 0, successPercent = 0.0;
    // TODO: check and track if test just run was successful
    if (Transition.Stm.currentState.properties.passed) {
      self.testSuiteResults.numPassed += 1;
      self.testSuiteResults[Transition.Stm.name].finished = new Date();
    }
    else {
      self.testSuiteResults.numFailed += 1;
    }

    // TODO: set the current test in the drop-down
    // TODO: time each test, and the full suite
    self.testIndex += 1;
    if (self.testIndex >= self.tests.length) {
      // Clear the binding for this event
      $(document).bind('Transition.test.completed');

      self.testSuiteComplete = true;
      self.testSuiteResults.endTimeMs = Transition.Stm.getTimeMs();
      self.testSuiteResults.elapsedTimeMs = self.testSuiteResults.endTimeMs - self.testSuiteResults.startTimeMs;

      self.testSuiteResults.totalTestsRun = totalTestsRun = self.testSuiteResults.numPassed + self.testSuiteResults.numFailed;
      self.testSuiteResults.successPercent = successPercent = (self.testSuiteResults.numPassed / totalTestsRun).toFixed(2) * 100;
      Transition.log('Full suite completed: ' + self.testSuiteResults.numPassed + ' of ' + totalTestsRun + ' passed ' + successPercent + '% in ' + self.testSuiteResults.elapsedTimeMs + ' ms.');

      if (self.callbacks.onSuiteCompletion) {
        self.callbacks.onSuiteCompletion(self.testSuiteResults);
      }

      return true;
    }

    try {
      Transition.Stm.reset();
    }
    catch (e2) {
    }
    self.loadScript(self.tests[self.testIndex].uri);
    self.testSuiteResults[Transition.Stm.name] = {
      started: new Date()
    };
    Transition.Stm.start();
  };

  self.runAll = function (e) {
    self.testIndex = 0;
    self.testSuiteComplete = false;
    self.testSuiteResults = {testResults: {}, numPassed: 0, numFailed: 0, startTimeMs: Transition.Stm.getTimeMs() };
    $(document).bind('Transition.test.completed', self.runNextTest);
    try {
      Transition.Stm.reset();
    }
    catch (e2) {
    }
    self.loadScript(self.tests[self.testIndex].uri);
    self.testSuiteResults[Transition.Stm.name] = {
      started: new Date()
    };
    Transition.Stm.start();
  };

  self.clearLogConsole = function () {
    $('#test-log').html('');
  };

  self.buildDebugger = function () {
    var body = $('body'), navDiv, logDiv;
    navDiv = $('<div>');
    navDiv.append("<select id='registered-tests'></select>");
    navDiv.append('<button id="start-test">Start</button>');
    navDiv.append('<button id="stop-test">Stop</button>');
    navDiv.append('<button id="step-test">Step</button>');
    navDiv.append('<button id="continue-test">Continue</button>');
    navDiv.append('<button id="reset-log-console">Clear Log</button>');
    navDiv.append('<button id="reload-current-test">Reload</button>');
    navDiv.append('<button id="run-all">Run All</button>');
    navDiv.append('<span>Current State: <span id="current-state"></span></span>');
    logDiv = $('<div>');
    logDiv.attr('id', "test-content");
    logDiv.append('<pre id="test-log"></pre>');
    body.append(navDiv);
    body.append(logDiv);
    $(document).bind('Transition.stateChanged', function (e) {
      var desc = '[' + Transition.Stm.currentState.name + '] ' + Transition.Stm.name;
      $('#current-state').html(desc);
    });
  };

  self.init = function () {
    self.buildDebugger();
    var registeredTests = $('#registered-tests');
    $.each(self.tests, function (idx, cfg) {
      var option = $('<option>');
      option.attr('value', cfg.name);
      option.text(cfg.name);
      registeredTests.append(option);
    });

    registeredTests.change(self.testSelected);
    self.testSelected();

    $("#start-test").click(function (e) {
      e.preventDefault();
      if (Transition.Stm.testHalted) {
        Transition.Stm.start();
        return false;
      }
      return false;
    });
    $("#stop-test").click(Transition.Stm.stopTest);
    $("#step-test").click(Transition.Stm.stepTest);
    $("#continue-test").click(Transition.Stm.continueTest);
    $("#reset-log-console").click(self.clearLogConsole);
    $("#reload-current-test").click(self.reloadCurrentTest);
    $("#run-all").click(self.runAll);
  };

  self.onReady = function () {
    if (-1 !== parent.location.search.toString().indexOf("autoStart=true") ) {
      $('#run-all').click();
    };
  };

  $(document).ready(self.onReady);

  return self;
}());
