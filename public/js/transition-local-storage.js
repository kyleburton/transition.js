/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false, newcap:false */
/*global window, jQuery, _, Backbone, console, sprintf */
"use strict";

(function () {
  var root = this,
      LocalStorage = {};

  Transition.LocalStorage = LocalStorage;

  LocalStorage.initialize = function () {
    // do nothing if no local storage
  };

  if (!Modernizr.localstorage) {
    //console.log('localStorage not available');
    return;
  }

  //console.log('Will use HTML5 Local Storage');

  LocalStorage.initialize = function () {
    // load settings from local storage
    //console.log('LocalStorage.initialize');
    var attrs;
    try {
      attrs = JSON.parse(localStorage.getItem('transition.settings'));
      Transition.models.settings.clear({silent: true});
      Transition.models.settings.set(attrs);
    }
    catch(e) {
      // ignore, just won't be any local storage
      console.log('Error loading settings from localStorage: %o', e);
      console.log(e);
    }

    Transition.models.settings.on('change', function (model, options) {
      //console.log('saving settings to local storage: %o', model.toJSON());
      localStorage.setItem('transition.settings', JSON.stringify(model.toJSON()));
    });
  };

}(this));
