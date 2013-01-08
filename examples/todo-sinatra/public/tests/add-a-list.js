/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

(function () {
  this.addTest({
    name: 'Add a List',

    states: [
      this.newState('init', this.navigateTo_('/'))
        .to('deleteTestList', this.elementExists_('li a:contains("Test")'))
        .to('mainPage',       this.elementNotExists_('li a:contains("Test")')),
      this.newState('deleteTestList', TodoTestLib.deleteTestList)
        .to('deleteTestList', this.elementExists_('li a:contains("Test")'))
        .to('mainPage',       this.elementNotExists_('li a:contains("Test")')),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('createList',     this.elementExists_('input[name="list[name]"]:visible')),
      this.newState('createList', TodoTestLib.createTestList)
        .to('success',        this.elementExists_('li a:contains("Test")'))
    ]
  });
}.call(Transition));
