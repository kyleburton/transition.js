/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition */
"use strict";

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
      {to: 'deleteTestList', pred: Transition.elementExists_('li a:contains("Test")') }
      ),
    Transition.newState('deleteTestList', 'deleteTestList', {},
      {to: 'deleteTestList',     pred: Transition.elementExists_('li a:contains("Test")') },
      {to: 'mainPage',           pred: Transition.elementNotExists_('li a:contains("Test")') }
      ),
    Transition.newState('mainPage', Transition.navigateTo_('/'), {},
      {to: 'createList', pred: Transition.elementExists_('input[name="list[name]"]:visible') }
      ),
    Transition.newState('createList', 'createList', {},
      {to: 'success', pred: Transition.elementExists_('li a:contains("Test")') }
      )
  ],

  deleteTestList: function () {
    Transition.find('p.delete-list a').click();
  },

  createList: function () {
    Transition.find('input[name="list[name]"]').val('Test');
    Transition.find('input[type=submit]:visible').click();
  }
});
