/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

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

Transition.loadScript('/tests/index-page.js');
Transition.loadScript('/tests/add-a-list.js');
Transition.loadScript('/tests/add-todo-item.js');
Transition.loadScript('/tests/mark-item-as-done.js');

