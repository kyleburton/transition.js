/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, ActiveXObject, $ */
"use strict";

var Transition = Transition || (function () {
  var self = {webAppFrameName: 'main'};

  self.maxAjaxWait = 10000;

  self.document = function () {
    return parent[self.webAppFrameName];
  };

  self.createxmlhttprequest = function () {
    try {
      return new XMLHttpRequest();
    }
    catch (e1) {
      // ignore
    }
    try {
      return new ActiveXObject('Msxml2.XMLHTTP');
    }
    catch (e2) {
      // ignore
    }
    return null;
  };

  self.syncRun = function (req) {
    var xhreq = self.createxmlhttprequest();
    xhreq.open(req._requestMethod, req._url, false);
    xhreq.setRequestHeader('Content-Type', 'application/json');
    xhreq.onreadystatechange = function () {
      if (xhreq.readystate !== 4) {
        return;
      }
      var serverresponse = xhreq.responsetext;
    };

    xhreq.send(JSON.stringify(req._data));
    req.handlers.onProtocolSuccess(JSON.parse(xhreq.responseText));
  };

  self.noop = function () {
  };

  self.prependLogMesasge = function (msg) {
    parent.test.$('#test-log').prepend(msg);
  };

  self.log = function () {
    var str = '', ii;
    str += (new Date()).toString() + ': ';
    for (ii = 0; ii < arguments.length; ii += 1) {
      str += arguments[ii];
    }
    str += "\n";
    self.prependLogMesasge(str);
  };

  self.error = function () {
    var str = '', ii;
    str += 'ERROR: ' + (new Date()).toString() + ': ';
    for (ii = 0; ii < arguments.length; ii += 1) {
      str += arguments[ii];
    }
    str += "\n";
    self.prependLogMesasge(str);
  };

  self.dom = function () {
    if (!self.document()) {
      self.raise("no document is loaded in the main frame");
    }
    return self.document().document;
  };
  
  self.findVisibleText = function (text) {
    return parent[self.webAppFrameName].$("*:contains(" + text + "):visible:last");
  };

  self.find = function (selector) {
    return parent[self.webAppFrameName].$(selector);
  };

  self.findText = function (selector) {
    return self.find(selector).text();
  };

  self.elementExists = function (selector) {
    return self.find(selector).length !== 0;
  };

  self.elementExists_ = function (selector) {
    return function () {
      return self.elementExists(selector);
    };
  }; 

  self.isChecked = function (selector) {
    return self.find(selector).is(':checked');
  };

  self.isChecked_ = function (selector) {
    return function () {
      return self.isChecked(selector);
    };
  };

  self.isNotChecked = function (selector) {
    var elt = self.find(selector);
    // false if no element found
    if (elt.length < 1) {
      return false;
    }
    return !elt.is(':checked');
  };

  self.isNotChecked_ = function (selector) {
    return function () {
      return self.isNotChecked(selector);
    };
  };

  self.navigateTo = function (url) {
    if (!url) {
      return false;
    }
    parent.main.window.location.href = url;
    return url;
  };

  self.navigateTo_ = function (url) {
    return function () {
      self.navigateTo(url);
    };
  };

  self.click = function (selector) {
    var elt = self.find(selector);
    if (elt.length > 0) {
      return self.navigateTo(elt.attr('href'));
    }
    console.error('Sorry, could not find : ' + selector);
    return false;
  };

  self.clickNode = function (selector) {
    var elt = self.find(selector);
    if (elt.length !== 1) {
      self.log('Error: unable to click: ' + selector);
    }
    elt.click();
  };

  self.curryAll = function (fn) {
    return function () {
      var theArgs = arguments;
      return function () {
        console.dir(theArgs);
        fn.apply(fn, theArgs);
      };
    };
  };

  self.clickNode_ = self.curryAll(self.clickNode);

  self.propertyExists = function (object, property) {
    return object[property] !== undefined;
  };

  self.propertyExists_ = function (object, property) {
    return function () {
      self.propertyExists(object, property);
    };
  };

  self.raise = function (msg) {
    self.log("Error: " + msg);
    throw msg;
  };

  return self;
}());

Transition.Stm = (function () {
  var self = {};

  self.reset = function () {
    self.states          = {};
    self.testHalted      = true;
    self.testInit        = function () {};
    self.name            = 'no test name given';
    self.maxTestTimeout  = 10000;
    self.maxStateTimeout = 5000;
    self.pollTime        = 250;
    self.passed          = false;
    self.startState      = undefined;
    self.currentState    = undefined;
    self.stepOnce        = false;
  };

  self.reset();

  self.breakpoint = function (fn) {
    self.log('breakpoint (click Step or Continue to continue)');
    self.stepOnce = true;
    if (fn) {
      return fn();
    }
    return true;
  };

  self.breakpoint_ = function (fn) {
    return function () {
      return self.breakpoint(fn);
    };
  };

  self.start = function (stepOnce) {
    var msg, testInit;

    if (self.testRunning) {
      self.log('test currently running.');
      return;
    }

    if (!self.stmInitialized) {
      self.log('Error: Transition.Stm.init() was not called, you must call Transition.Stm.init before calling start.');
      throw ('Error: Transition.Stm.init() was not called, you must call Transition.Stm.init before calling start.');
    }

    self.testRunning = true;
    self.stepOnce = stepOnce;

    testInit = self.testInit || self.noop;
    self.testHalted = false;
    testInit();

    self.startTimeMs = self.getTimeMs();
    self.currentState = self.startState;
  
    if (!self.currentState) {
      msg = 'Error: test [' + self.name + '] did not define a start state';
      self.terminateTest(false, msg);
      throw (msg);
    }
  
    self.log('Starting [' + self.name + ']');
    self.startState.handler();
  
    self.timeout = setTimeout(self.pollStates, self.pollTime);
  };
  
  self.stopPolling = function () {
    if (self.interval) {
      clearInterval(self.interval);
    }
  };
  
  self.log = function () {
    var str = '', ii, currentStateName = self.currentState ? self.currentState.name : '**no current state**';
    for (ii = 0; ii < arguments.length; ii += 1) {
      str += arguments[ii];
    }
    Transition.log('[' + currentStateName + ']: ' + str);
  };
  
  self.terminateTest = function (status, message) {
    self.testHalted = true;
    self.testRunning = false;
    self.stopPolling();
    self.passed = status;
    self.endTimeMs = self.getTimeMs();

    message = message || '';
    if (status) {
      self.log('TEST PASSED [' + self.name + '] in ' + self.totalTestTimeMs() + ' ms ' + message);
    }
    else {
      self.log('TEST FAILED [' + self.name + '] in ' + self.totalTestTimeMs() + ' ms ' + message);
    }

    try {
      $(document).trigger('Transition.test.completed');
    }
    catch (e) {
    }

    return status;
  };
  
  self.pollStates = function () {
    var destination = null, ii, pred, res, nextState;

    if (self.testHalted) {
      return self.terminateTest(false, 'Test halted.');
    }

    if (self.currentState.properties.stop) {
      return self.terminateTest(self.currentState.properties.passed);
    }
  
    // stop if we timed out
    if (!self.stepOnce && self.elapsedTimeMs() > self.maxTestTimeout) {
      return self.terminateTest(false, 'timed out after ' + (self.maxTestTimeout / 1000) + ' seconds');
    }
  
    console.dir(self.currentState);
    for (ii = 0; ii < self.currentState.exitPredicates.length; ii += 1) {
      pred = self.currentState.exitPredicates[ii];

      try {
        res  = pred.pred();
      }
      catch (e) {
        self.lastError = e;
        console.log(e);
        console.log(e.stack);
      }

      console.log('[' + self.currentState.name + '] trying pred[' + pred.to + '] :' + res);
      if (res) {
        self.log('transitioning to: ' + pred.to);
        destination = pred.to;
        break;
      }
    }
  
    if (destination === null) {
      self.log('no exit predicate matched: (' + self.summarizeExitPredicates() + ')');
      self.scheduleNextPoll();
      return false;
    }
  
    // fail if to is invalid
    if (!self.states[destination]) {
      return self.terminateTest(false, 'Error: non-existant to state from [' + self.currentState.name + '] to [' + destination + ']');
    }
  
    nextState = self.states[pred.to];
    self.currentState = nextState;
    self.currentState.handler();
    $(document).trigger('Transition.stateChanged');
  
    self.scheduleNextPoll();

    return true;
  };

  self.summarizeExitPredicates = function () {
    var preds = [], pred, ii;
    for (ii = 0; ii < self.currentState.exitPredicates.length; ii += 1) {
      pred = self.currentState.exitPredicates[ii];
      preds.push(pred.to);
    }
    return preds.join(", ");
  };

  self.scheduleNextPoll = function () {
    if (self.stepOnce) {
      return;
    }
    self.timeout = setTimeout(self.pollStates, self.pollTime);
  };

  self.getTimeMs = function () {
    return new Date().getTime();
  };
  
  self.elapsedTimeMs = function () {
    return self.getTimeMs() - self.startTimeMs;
  };

  self.totalTestTimeMs = function () {
    return self.endTimeMs - self.startTimeMs;
  };

  self.newState = function (name, handler, properties) {
    var state = {
      name:            name,
      handler:         handler,
      properties:      properties || {},
      exitPredicates:  []
    }, ii, pred, msg;
  
    if (!name)    { 
      msg = 'Error: state name is not defined';
      self.terminateTest(false, msg);
      throw (msg);
    }
    if (!handler) {
      msg = 'Error: state [' + name + '] handler is not defined';
      self.terminateTest(false, msg);
      throw (msg);
    }
  
    for (ii = 3; ii < arguments.length; ii += 1) {
      pred = arguments[ii];
      if (!pred.pred) {
        msg = 'Error: state[' + name + '] transition ' + pred.to + ' has no predicate';
        self.terminateTest(false, msg);
        self.log('throwing: ', msg);
        throw (msg);
      }
      state.exitPredicates.push(pred);
    }
  
    if (state.properties.start) {
      self.startState = state;
    }
  
    self.states[name] = state;
  };
  
  self.compliment = function (fn) {
    return function () {
      return !fn();
    };
  };
  
  self.noop = function () {
    // nothing
  };

  self.stopTest = function (e) {
    e.preventDefault();
    self.stepOnce = true;
    return false;
  };

  self.stepTest = function (e) {
    if (e) {
      e.preventDefault();
    }
    if (self.testRunning) {
      self.pollStates();
      return false;
    }
    self.start(true);
    return false;
  };

  self.captureStmState = function () {
    return { currentState: self.currentState,
             testRunning:  self.testRunning };
  };

  self.restoreStmState = function (st) {
    self.currentState = st.currentState;
    self.testRunning  = st.testRunning;
    if (self.testRunning) {
      self.testHalted = false;
    }
  };

  self.continueTest = function (e) {
    e.preventDefault();
    if (self.testRunning) {
      self.stepOnce = false;
      self.pollStates();
      return false;
    }
    self.start(false);
    return false;
  };

  self.init = function (testInit) {
    self.stmInitialized = true;
    self.testInit = self.testInit || testInit;

    if (!self.states.success) {
      self.newState('success', self.noop, {stop: true, passed: true});
    }

    if (!self.states.failure) {
      self.newState('failure', self.noop, {stop: true, passed: false});
    }
  };

  return self;
}());

Transition;
