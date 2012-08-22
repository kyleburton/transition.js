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
      Transition.error('Error fetching test script: ' + url);
    };
  };

  self.loadScript = function (url) {
    $.ajax({
      url:      url,
      dataType: "script",
      async:    false,
      error:    self.scriptLoadErrorFn(url),
      success:  function () {
        Transition.logOk('Loaded ' + self.currentTest().name + ' from ' + self.currentTest().uri);
      }
    });
  };

  self.reportTestSuiteCompletion = function () {
    var totalTestsRun = 0, successPercent = 0.0, msg;
    // Clear the binding for this event
    $(document).bind('Transition.test.completed');

    // report a summary of the failures:
    $.each(self.testSuiteResults.testResults, function (idx, testResult) {
      if (testResult.status) {
        Transition.logGood('...PASSED: ' + testResult.name);
      }
      else {
        Transition.logBad('...FAILED: ' + testResult.name);
      }
    });


    self.testSuiteComplete = true;
    self.testSuiteResults.endTimeMs = Transition.Stm.getTimeMs();
    self.testSuiteResults.elapsedTimeMs = self.testSuiteResults.endTimeMs - self.testSuiteResults.startTimeMs;

    self.testSuiteResults.totalTestsRun = totalTestsRun = self.testSuiteResults.numPassed + self.testSuiteResults.numFailed;
    self.testSuiteResults.successPercent = successPercent = (self.testSuiteResults.numPassed / totalTestsRun).toFixed(2) * 100;
    msg = 'Full suite completed: ' + self.testSuiteResults.numPassed + ' of ' + totalTestsRun + ' passed ' + successPercent + '% in ' + self.testSuiteResults.elapsedTimeMs + ' ms.';

    if (totalTestsRun === self.testSuiteResults.numPassed) {
      Transition.logGood(msg);
    }
    else {
      Transition.error(msg);
    }

    if (self.callbacks.onSuiteCompletion) {
      self.callbacks.onSuiteCompletion(self.testSuiteResults);
    }

    return true;
  };

  self.runNextTest = function (e) {
    // TODO: check and track if test just run was successful
    self.testSuiteResults.testResults[Transition.Stm.name].finished = new Date();
    if (Transition.Stm.currentState.properties.passed) {
      self.testSuiteResults.numPassed += 1;
      self.testSuiteResults.testResults[Transition.Stm.name].status = true;
    }
    else {
      self.testSuiteResults.numFailed += 1;
      self.testSuiteResults.testResults[Transition.Stm.name].status = false;
    }

    // TODO: set the current test in the drop-down
    // TODO: time each test, and the full suite
    self.testIndex = self.idxOfNextTest(self.testIndex);
    $('#registered-tests:nth-child(' + self.testIndex + ')').attr('selected', 'selected');

    // test suite is all done
    if (self.testIndex >= self.tests.length || -1 === self.testIndex) {
      return self.reportTestSuiteCompletion();
    }

    try {
      Transition.Stm.reset();
    }
    catch (e2) {
    }
    self.loadScript(self.tests[self.testIndex].uri);
    self.testSuiteResults.testResults[Transition.Stm.name] = {
      started: new Date(),
      name:    Transition.Stm.name,
      status:  null
    };
    Transition.Stm.start();
  };

  self.doRunPendingTests = function () {
    return $('#run-pending').is(':checked');
  };

  self.idxOfNextTest = function (startAt) {
    var ii, idx = -1;
    startAt = startAt || -1;
    for (ii = startAt + 1; ii < self.tests.length; ii += 1) {
      if (!self.tests[ii].pending || self.doRunPendingTests()) {
        idx = ii;
        break;
      }
    }
    return idx;
  };

  /**
   * Start the test suite.
   *
   */
  self.runAll = function (e) {
    self.testIndex = self.idxOfNextTest(-1);
    self.testSuiteComplete = false;
    self.testSuiteResults = {testResults: {}, numPassed: 0, numFailed: 0, startTimeMs: Transition.Stm.getTimeMs() };
    $(document).bind('Transition.test.completed', self.runNextTest);
    try {
      Transition.Stm.reset();
    }
    catch (e2) {
    }
    self.loadScript(self.tests[self.testIndex].uri);
    self.testSuiteResults.testResults[Transition.Stm.name] = {
      started: new Date(),
      name:    Transition.Stm.name,
      status:  null
    };
    Transition.Stm.start();
  };

  self.clearLogConsole = function () {
    $('#test-log').html('');
  };

  self.buildDebugger = function () {
    var body = $('body'), navDiv, logDiv,
        height = $(window).height(),
        width  = $(window).width(), 
        divWidth = width * 0.98;
    navDiv = $('<div style="height: 50%; width: ' + divWidth + 'px; overflow: auto; border: 1px solid #CCC; margin: auto;">');
    navDiv.append("<select id='registered-tests'></select>");
    navDiv.append("<br />");
    navDiv.append('<button id="start-test">Start</button>');
    navDiv.append('<button id="stop-test">Stop</button>');
    navDiv.append('<button id="step-test">Step</button>');
    navDiv.append('<button id="continue-test">Continue</button>');
    navDiv.append('<button id="reset-log-console">Clear Log</button>');
    navDiv.append('<button id="reload-current-test">Reload</button>');
    navDiv.append('<button id="run-all">Run Suite</button>');
    navDiv.append('<input type="checkbox" value="true" id="run-pending">Run Pending</button>');
    navDiv.append("<br />");
    navDiv.append('<span>Current State[<span id="suite-count"></span>]: <span id="current-state"></span></span>');
    logDiv = $('<div>');
    logDiv.attr('id', "test-content");
    logDiv.append('<div style="border : solid 1px #CCC; height: 50%; width: ' + divWidth + 'px; overflow : auto; margin: auto;"><div id="test-log"></div></div>');
    body.append(navDiv);
    body.append(logDiv);
    $(document).bind('Transition.stateChanged', function (e) {
      var desc = '[' + Transition.Stm.currentState.name + '] ' + Transition.Stm.name;
      $('#current-state').html(desc);
    });

    $('#suite-count').html(self.nonPendingTestCount() + "/" + self.pendingTestCount());
  };

  self.pendingTestCount = function () {
    var count = 0, ii;
    for (ii = 0; ii < self.tests.length; ii += 1) {
      if (self.tests[ii].pending) {
        count += 1;
      }
    }
    return count;
  };

  self.nonPendingTestCount = function () {
    var count = 0, ii;
    for (ii = 0; ii < self.tests.length; ii += 1) {
      if (!self.tests[ii].pending) {
        count += 1;
      }
    }
    return count;
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
    if (-1 !== parent.location.search.toString().indexOf("autoStart=true")) {
      $('#run-all').click();
    }
  };

  $(document).ready(self.onReady);

  return self;
}());
