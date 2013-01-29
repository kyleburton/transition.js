/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

(function () {
  this.addTest({
    name: 'Add a List',

    states: [
      this.newState('init', this.navigateTo_('/'))
        .to('deleteTestList').when('li a:contains("Test")')
        .to('mainPage')      .when('!li a:contains("Test")'),
      this.newState('deleteTestList', TodoTestLib.deleteTestList)
        .to('deleteTestList').when('li a:contains("Test")')
        .to('mainPage')      .when('!li a:contains("Test")'),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('createList')    .when('input[name="list[name]"]:visible'),
      this.newState('createList', TodoTestLib.createTestList)
        .to('success')       .when('li a:contains("Test")')
    ]
  });
}.call(Transition));
