/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";


// If you don't like where the default frame divider is (50%,50%), you can adjust it:
Transition.setFrameDivider(60);
Transition.models.settings.set('pollTimeout', 250);
Transition.models.settings.set('logLevel',    Transition.Log.Levels.DEBUG);

(function () {
  var root        = this,
      TodoTestLib = {};

  this.TodoTestLib = TodoTestLib;

  TodoTestLib.deleteTestList = function () {
    var old = parent.frames.main.confirm;
    parent.frames.main.confirm = function () {
      return true;
    };
    parent.frames.main.$('a[data-method=delete]').click();
    parent.frames.main.confirm = old;
  };

  TodoTestLib.createTestList = function () {
    Transition.find('input[name="list[name]"]').val('Test');
    Transition.find('input[type=submit]:visible').click();
  };

}.call(this));


// Other tests to create:
// *) Delete an item

// TODO: Tags support
// TODO: you can segment your tests based on different criteria:
//   * IE only
//   * Mobile Only
//   * and so on...
// TODO: re-run just the subset of the suite that failed
// TODO: add hooks to allow the log to be sent to a back-end (remember the simple sinatra app)
// TODO: add hooks to allow the test results to be sent to a back-end (remember the simple sinatra app)

Transition.loadScript('/tests/index-page.js');
Transition.loadScript('/tests/add-a-list.js');
Transition.loadScript('/tests/add-todo-item.js');
Transition.loadScript('/tests/mark-item-as-done.js');

