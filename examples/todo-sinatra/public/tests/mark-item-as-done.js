/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

(function () {
  this.addTest({
    name: 'Mark and item as done.',
  
    states: [
      this.newState('init', this.navigateTo_('/'))
        .to('deleteTestList').when('li a:contains("Test")')
        .to('mainPage')      .when('!liContainsTestItem'),
      this.newState('deleteTestList', TodoTestLib.deleteTestList)
        .to('deleteTestList').when('li a:contains("Test")')
        .to('mainPage')      .when('!li a:contains("Test")'),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('createList')    .when('input[name="list[name]"]:visible'),
      this.newState('createList', TodoTestLib.createTestList)
        .to('addItem')       .when('li a:contains("Test")'),
      this.newState('addItem', 'addItem')
        .to('markItemDone')  .when('li:contains("item")'),
      this.newState('markItemDone', 'checkAllCheckboxes')
        .to('success')       .when('li.finished:contains("item")'),
    ],

    liContainsTestItem: function () {
      return this.elementExists('li a:contains("Test")');
    },

    addItem: function () {
      this.find('input[name="task[name]"]').val('item');
      this.find('form:visible').submit();
    },

    checkAllCheckboxes: function () {
      this.find('input[type=checkbox]').attr('checked', 'checked');
      this.find('input[type=checkbox]').trigger('click');
    }
  });

}.call(Transition));
