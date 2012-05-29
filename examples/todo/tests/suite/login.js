/*jslint browser: true, maxerr: 50, indent: 2, nomen: false */
/*global window, console, Transition */
"use strict";

var LoginTest = LoginTest || (function () {
  var self = {state: {}};

  Transition.Stm.name = "Login Test";

  self.doLogout = function () {
    self.state.isLoggedOut = false;
    Todo.logoutRequest()
      .onStatus('OK', function (response) {
        self.state.isLoggedOut = true;
      })
      .run();
  };

  self.doLogin = function () {
    Transition.find('input[name=email]').val('kyle.burton@gmail.com');
    Transition.find('input[name=password]').val('secret');
    Transition.find('button#login').click();

  };

  Transition.Stm.newState('logout', self.doLogout, {start: true},
    {to: 'viewLogin', pred: function () { return self.state.isLoggedOut; } }
  );

  Transition.Stm.newState('viewLogin', Transition.navigateTo_('/login'), {},
    {to: 'doLogin', pred: Transition.elementExists_('input[name=email]') }
  );

  Transition.Stm.newState('doLogin', self.doLogin, {},
    {to: 'success', pred: Transition.elementExists_('div#todo-list') }
  );

  Transition.Stm.init();

  return self;
}());
