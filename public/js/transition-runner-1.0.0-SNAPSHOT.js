/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, Transition */
"use strict";

Transition.Runner = Transition.Runner || (function () {
  var self = {tests: [], testsByName: {}};

  self.addTests = function () {
    var ii;
    for (ii = 0; ii < arguments.length; ii +=1) {
      self.addTest(arguments[ii]);
    }
  };

  self.addTest = function (cfg) {
    if (!cfg.name) {
      Transition.throw("Error: configuration has no name (required): " + JSON.stringify(cfg));
    }

    if (!cfg.uri) {
      Transition.throw("Error: configuration has no uri (required): " + JSON.stringify(cfg));
    }

    if (self.testsByName[cfg.name]) {
      Transition.throw("Error: test alreay exists with that name: " + JSON.stringify(cfg));
    }

    self.testsByName[cfg.name] = cfg;
    self.tests.push(cfg);
  };

  self.currentTest = function () {
    var name = $('#registered-tests').val(),
        cfg  = self.testsByName[name];

    if (!cfg) {
      Transition.throw("Error: no registered test with name: " + name);
    }

    return cfg;
  };

  self.testSelected = function (e) {
    if (e) {
      e.preventDefault();
    }

    Transition.Stm.reset();
    $.getScript(self.currentTest().uri);
    Transition.log('Loaded ' + self.currentTest().name + ' from ' + self.currentTest().uri);
    return false;
  };

  self.loadScript = function (url) {
    $.ajax({
      url:      url,
      dataType: "script",
      async:    false
    });
  };

  self.runNextTest = function (e) {
    // TODO: check and track if test just run was successful
    // TODO: set the current test in the drop-down
    // TODO: time each test, and the full suite
    self.testIndex += 1;
    if ( self.testIndex >= self.tests.length ) {
      $(document).bind('Transition.test.completed');
      Transition.log('Full suite completed.');
      return true;
    }

    console.log('run next test: ' + self.testIndex);
    try { Transition.Stm.reset(); }
    catch (e) { }
    self.loadScript(self.tests[self.testIndex].uri);
    Transition.Stm.start();
  };

  self.runAll = function (e) {
    self.testIndex = 0;
    $(document).bind('Transition.test.completed', self.runNextTest);
    try { Transition.Stm.reset(); }
    catch (e) { }
    self.loadScript(self.tests[self.testIndex].uri);
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
    logDiv.attr('id',"test-content");
    logDiv.append('<pre id="test-log"></pre>');
    body.append(navDiv);
    body.append(logDiv);
    $(body).bind('Transition#stateChanged', function (e) {
      $('#current-state').html(Transition.Stm.currentState.name);
    });
  };

  self.init = function () {
    self.buildDebugger();
    var registeredTests = $('#registered-tests');
    $.each(self.tests, function(idx, cfg) {
      var option = $('<option>');
      option.attr('value', cfg.name);
      option.text(cfg.name);
      console.log('appending option ' + JSON.stringify(cfg));
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
    $("#reload-current-test").click(self.testSelected);
    $("#run-all").click(self.runAll);
  };

  return self;
}());
