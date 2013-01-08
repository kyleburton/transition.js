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
        .to('deleteTestList', this.elementExists_('li a:contains("Test")'))
        .to('mainPage',       this.elementNotExists_('li a:contains("Test")')),
      this.newState('deleteTestList', TodoTestLib.deleteTestList)
        .to('deleteTestList',     this.elementExists_('li a:contains("Test")'))
        .to('mainPage',           this.elementNotExists_('li a:contains("Test")')),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('createList', this.elementExists_('input[name="list[name]"]:visible')),
      this.newState('createList', TodoTestLib.createTestList)
        .to('addItem', 'testListExists'),
      this.newState('addItem', 'addItem')
        .to('success', this.elementExists_('li:contains("item")'))
    ],

    testListExists: function () {
      return this.elementExists('li a:contains("Test")')
    },

    // NB: test using a named member fn as a predicate
    addItem: function () {
      this.find('input[name="task[name]"]').val('item');
      this.find('form:visible').submit();
    }
  });

}.call(Transition));
