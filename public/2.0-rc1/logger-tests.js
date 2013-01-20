describe("Transition ", function () {

  beforeEach( function () {
    console.log('clearing the suite');
    Transition.models.suite.reset();
  });


  describe("Test", function () {
    it(" without an on-enter function should default to Transition.noop", function () {
      Transition.addTest({
        name: 'default to Transition.noop',
        states: [
          Transition.newState('init')
            .to('success').when(Transition.constantly_(true))
        ]
      });

      expect(Transition.models.suite.models[0].getState('init').get('onEnter')).toBe(Transition.noop);
    });
  
    it(" declaring a start state should be invalid.", function () {
      Transition.addTest({
        name: 'start should cause an error.',
        states: [
          Transition.newState('start')
            .to('success').when(Transition.constantly_(true))
        ]
      });

      expect(Transition.models.logEntries.last().get('message')).toMatch('Error');
    });

  });


  describe("Logger Tests", function () {
    _.each([
      {desc: 'trace', level: Transition.Log.Levels.TRACE, fn: Transition.Log.trace},
      {desc: 'debug', level: Transition.Log.Levels.DEBUG, fn: Transition.Log.debug},
      {desc: 'info',  level: Transition.Log.Levels.INFO,  fn: Transition.Log.info},
      {desc: 'warn',  level: Transition.Log.Levels.WARN,  fn: Transition.Log.warn},
      {desc: 'error', level: Transition.Log.Levels.ERROR, fn: Transition.Log.error},
      {desc: 'fatal', level: Transition.Log.Levels.FATAL, fn: Transition.Log.fatal}
      ], function (t) {
        var testDescription = "Log." + t.desc + " should log if the level is set to " + t.desc;
        it(testDescription, function () {
          var msg = t.desc + " test: " + (new Date()).getTime();
          Transition.models.settings.set('logLevel', t.level);
          t.fn(msg);
          expect(Transition.models.logEntries.last().get('message')).toMatch(msg);
        });
  
        testDescription = "Log." + t.desc + " should NOT log if the level is set above  " + t.desc;
        it(testDescription, function () {
          var msg = t.desc + " test: " + (new Date()).getTime();
          Transition.models.settings.set('logLevel', t.level + 1);
          t.fn(msg);
          expect(Transition.models.logEntries.last().get('message')).toMatch(msg);
        });
      });
  });
  
});
