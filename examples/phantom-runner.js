/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, ActiveXObject, $ */
"use strict";

var page   = require('webpage').create();
var system = require('system');
var fs     = require('fs');

var startTime = new Date();
var outputFile = 'results.json';

page.onConsoleMessage = function (msg) { console.log(msg); };

var transitionRunnerUri = "http://localhost:9292/transition/index.html";
if (system.args.length > 1) {
  transitionRunnerUri = system.args[1];
}

if (system.args.length > 2) {
  outputFile = system.args[2];
}

console.log('opening uri: ' + transitionRunnerUri);

page.open(transitionRunnerUri, function (status) {
  page.onLoadFinished = function() {};
  page.evaluate( function () {
    parent.frames.test.Transition.models.logEntries.on('add', function (entry) {
      console.log('' + entry.levelDescription() + ': '  + entry.get('message'));
    });
    parent.frames.test.Transition.Log.info('this is from phantom.js');
  });

  // Start the test suite
  page.evaluate( function () {
    parent.test.Transition.runSuite();
  });

});

setInterval(function () {
  var testResults, timeCompleted, elapsedTime;
  // check if the test suite has completed
  var testSuiteComplete = page.evaluate(function () {
    return !parent.test.Transition.suiteRunning;
  });

  if (testSuiteComplete) {
    timeCompleted = new Date();
    elapsedTime   = (timeCompleted.getTime() - startTime.getTime()) / 1000.0;
    testResults   = page.evaluate(function () {
      var Transition = parent.test.Transition;
      return {
        totalTests: Transition.models.suiteRunner.get('total'),
        numPassed:  Transition.models.suiteRunner.get('numPassed'),
        numFailed:  Transition.models.suiteRunner.get('numFailed')

      };
    });

    testResults.timeStarted   = startTime.getTime();
    testResults.timeCompleted = timeCompleted.getTime();
    testResults.elapsedTime   = timeCompleted.getTime() - startTime.getTime();

    console.log("Test Suite Completed " + elapsedTime + " seconds");
    console.log(" " + testResults.numPassed + " Passed " + 100.0 * (testResults.numPassed / testResults.totalTests) + '%');
    console.log(" " + testResults.numFailed + " Failed " + 100.0 * (testResults.numFailed / testResults.totalTests) + '%');
    console.log(JSON.stringify(testResults));
    fs.write(outputFile, JSON.stringify(testResults), "w");
    if ( testResults.numFailed > 0) {
      phantom.exit(1);
    }
    phantom.exit(0);
  }
}, 1000);

