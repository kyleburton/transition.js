/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, ActiveXObject, $ */
"use strict";

var page   = require('webpage').create();
var system = require('system')

page.onConsoleMessage = function (msg) { console.log(msg); };

var transitionRunnerUri = null;
if (system.args.length < 2) {
  transitionRunnerUri = "http://localhost:9292/transition/index.html";
}
else {
  transitionRunnerUri = system.args[1];
}

console.log('opening uri: ' + transitionRunnerUri);

page.open(transitionRunnerUri, function (status) {
  page.onLoadFinished = function() {};
  page.evaluate( function () {
    // Hook into the transition test log, send it to the console
    //parent.test.Transition.prependLogMesasge = function (msg) {
    //  console.log(">>>" + msg);
    //};
    parent.frames.test.Transition.models.logEntries.on('add', function (entry) {
      console.log('Test: ' + entry.get('message'));
    });
    parent.frames.test.Transition.Log.info('this is from phantom.js');
  });

  // Start the test suite
  page.evaluate( function () {
    parent.test.Transition.runSuite();
  });

});

setInterval(function () {
  // check if the test suite has completed
  var testSuiteComplete = page.evaluate(function () {
    return !parent.test.Transition.suiteRunning;
  });

  if (testSuiteComplete) {
    console.log("Test Suite Completed.");
    phantom.exit();
  }
}, 1000);

