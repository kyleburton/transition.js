/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, ActiveXObject, $ */
"use strict";

var page   = require('webpage').create();
var system = require('system')

page.onConsoleMessage = function (msg) { console.log(msg); };

var transitionRunnerUri = null;
if (system.args.length < 2) {
  transitionRunnerUri = "http://localhost:4567/tests/";
}
else {
  transitionRunnerUri = system.args[1];
}

console.log('opening uri: ' + transitionRunnerUri);

page.open(transitionRunnerUri, function (status) {
  page.onLoadFinished = function() {};
  page.evaluate( function () {
    // Override prependLogMesasge to print to the local console for output
    parent.test.Transition.prependLogMesasge = function (msg) {
      console.log(">>>" + msg);
    };
  });

  // Start the test suite
  page.evaluate( function () {
    parent.test.$('#run-all').click();
  });

});

setInterval(function () {
  // check if the test suite has completed
  var testSuiteComplete = page.evaluate(function () {
    return parent.test.Transition.Runner.testSuiteComplete;
  });

  if (testSuiteComplete) {
    var totalRun  = page.evaluate(function () { return parent.test.Transition.Runner.testSuiteResults.totalTestsRun; }),
        numPassed = page.evaluate(function () { return parent.test.Transition.Runner.testSuiteResults.numPassed; }),
        numFailed = page.evaluate(function () { return parent.test.Transition.Runner.testSuiteResults.numFailed; }),
        pctPassed = page.evaluate(function () { return parent.test.Transition.Runner.testSuiteResults.successPercent; });
    console.log(numPassed + ' passed, ' + numFailed + ' failed, out of ' + totalRun + ' ' + pctPassed + '%');
    phantom.exit();
  }
}, 500);
