/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

Transition.addTest({
  name: 'Mark and item as done.',
  initialize: function () {
    //console.log(this.get('name') + ' assert initial state: ensure we\'re logged out');
  },

  states: [
    Transition.newState('init', Transition.navigateTo_('/'), {},
      {to: 'deleteTestList', pred: Transition.elementExists_('li a:contains("Test")') },
      {to: 'mainPage',       pred: Transition.elementNotExists_('li a:contains("Test")') }
      ),
    Transition.newState('deleteTestList', TodoTestLib.deleteTestList, {},
      {to: 'deleteTestList',     pred: Transition.elementExists_('li a:contains("Test")') },
      {to: 'mainPage',           pred: Transition.elementNotExists_('li a:contains("Test")') }
      ),
    Transition.newState('mainPage', Transition.navigateTo_('/'), {},
      {to: 'createList', pred: Transition.elementExists_('input[name="list[name]"]:visible') }
      ),
    Transition.newState('createList', TodoTestLib.createTestList, {},
      {to: 'addItem', pred: Transition.elementExists_('li a:contains("Test")') }
      ),
    Transition.newState('addItem', 'addItem', {},
      {to: 'markItemDone', pred: Transition.elementExists_('li:contains("item")') }
      ),
    Transition.newState('markItemDone', 'markItemDone', {},
      {to: 'success', pred: Transition.elementExists_('li.finished:contains("item")') }
      )
  ],

  markItemDone: function () {
    Transition.find('input[type=checkbox]').click();
  },

  addItem: function () {
    Transition.find('input[name="task[name]"]').val('item');
    Transition.find('form:visible').submit();
  }
});

