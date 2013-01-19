/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

(function () {
  this.addTest({
    name: 'Add an entry to a List',
    initialize: function () {
      //console.log(this.get('name') + ' assert initial state: ensure we\'re logged out');
    },
  
    states: [
      this.newState('init', this.navigateTo_('/'))
        .to('deleteTestList', 'li a:contains("Test")')
        .to('mainPage',       '!li a:contains("Test")'),
      this.newState('deleteTestList', TodoTestLib.deleteTestList)
        .to('deleteTestList',     'li a:contains("Test")')
        .to('mainPage',           '!li a:contains("Test")'),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('createList', 'input[name="list[name]"]:visible'),
      this.newState('createList', TodoTestLib.createTestList)
        .to('addItem', 'testListExists'),
      this.newState('addItem', 'addItem')
        .to('success', 'li:contains("item")')
    ],

    // example of using a model function for a predicate
    testListExists: function () {
      return this.elementExists('li a:contains("Test")')
    },

    addItem: function () {
      this.find('input[name="task[name]"]').val('item');
      this.find('form:visible').submit();
    }
  });

}.call(Transition));
