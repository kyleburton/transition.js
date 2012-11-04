/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, Transition, TodoTestLib */
"use strict";

(function () {

  this.addTest({
    name: 'Test Index Page',

    states: [
      this.newState('init', this.navigateTo_('about:blank'))
        .to('mainPage', this.constantly_(true)),
      this.newState('mainPage', this.navigateTo_('/'))
        .to('failure', this.elementExists_('form[action="/lists"]'))
    ]
  });

}.call(Transition));
