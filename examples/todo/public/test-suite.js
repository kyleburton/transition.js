Transition.addTest({
  name: 'Test Index Page',
  initialize: function () {
    console.log('assert initial state: ensure we\'re logged out');
  },
  states: [
    Transition.newState('init', Transition.navigateTo_('about:blank'), {},
      {to: 'mainPage', pred: Transition.constantly_(true) }),
    Transition.newState('mainPage', Transition.navigateTo_('/'), {},
      {to: 'success', pred: Transition.elementExists_('input[name="email"]') }),
  ]
});

Transition.addTest({
  name: 'Test Login',
  initialize: function () {
    console.log('assert initial state: ensure we\'re logged out');
  },
  states: [
    Transition.newState('init', Transition.navigateTo_('about:blank'), {},
      {to: 'mainPage', pred: Transition.constantly_(true) }),
    Transition.newState('mainPage', Transition.navigateTo_('/'), {},
      {to: 'login', pred: Transition.elementExists_('input[name="email"]') }),
    Transition.newState('login', 'loginViaEmail', {},
      {to: 'success', pred: Transition.elementExists_('div#todo-list') }),
  ],

  loginViaEmail: function () {
    this.$('input[name="email"]').val('foo@bar.com');
    this.$('input[name="pass"]').val('secret');
    this.$('button').click();
  }
});
