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

Transition.addTest({
  name: 'Test Index Page',
  initialize: function () {
    console.log(this.get('name') + ' assert initial state: ensure we\'re logged out');
  },
  states: [
    Transition.newState('init', Transition.navigateTo_('about:blank'), {},
      {to: 'mainPage', pred: Transition.constantly_(true) }
      ),
    Transition.newState('mainPage', Transition.navigateTo_('/'), {},
      {to: 'success', pred: Transition.elementExists_('form[action="/lists"]') }
      )
  ]
});

Transition.addTest({
  name: 'Add a List',
  initialize: function () {
    // delete all lists named 'test'
    console.log(this.get('name') + ' assert initial state: ensure we\'re logged out');
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
      {to: 'success', pred: Transition.elementExists_('li a:contains("Test")') }
      )
  ]

});

Transition.addTest({
  name: 'Add an entry to a List',
  initialize: function () {
    console.log(this.get('name') + ' assert initial state: ensure we\'re logged out');
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
      {to: 'success', pred: Transition.elementExists_('li:contains("item")') }
      )
  ],

  addItem: function () {
    Transition.find('input[name="task[name]"]').val('item');
    Transition.find('form:visible').submit();
  }
});

// Other tests to create:
// *) Mark an item as done
// *) Delete an item

