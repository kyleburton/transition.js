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

  self.init = function () {
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
  };

  return self;
}());
