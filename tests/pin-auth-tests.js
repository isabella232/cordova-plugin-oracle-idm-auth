/**
 * Copyright (c) 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/* jshint esversion: 6 */
exports.defineAutoTests = function() {
  var idmAuthFlowPlugin = cordova.plugins.IdmAuthFlows;
  var pinChallengeReason = idmAuthFlowPlugin.LocalAuthPropertiesBuilder.PinChallengeReason;
  var localAuthTypes = idmAuthFlowPlugin.LocalAuthPropertiesBuilder.LocalAuthenticatorType;
  var pinAuthFlow, isCancelFlow, currPin, newPin, challengeReasons, enabledStates, loginResults;

  var resetTest = function() {
    challengeReasons = [];
    enabledStates = [];
    isCancelFlow = undefined;
    currPin = undefined;
    newPin = undefined;
    loginResults = [];
  };

  var pinChallenge = function (challengeReason, completionHandler) {
    challengeReasons.push(challengeReason);
    if (isCancelFlow) {
      completionHandler.cancel();
      return;
    }

    completionHandler.submit(currPin, newPin);
  };

  var pinAuthProps = new idmAuthFlowPlugin.LocalAuthPropertiesBuilder()
                            .id("testPinAuth")
                            .pinChallengeCallback(pinChallenge)
                            .build();

  var init = function(done) {
    idmAuthFlowPlugin.init(pinAuthProps)
      .then(function(flow) {
        pinAuthFlow = flow;
        done();
      })
      .catch(done);
  };

  describe('Test PIN based local authentication', function () {
    beforeAll(function(done) {
      defaultJasmineTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
      init(done);
    });
    afterAll(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultJasmineTimeout;
    });

    describe('verify init', function() {
      it('is inited correctly', function(done) {
        expect(pinAuthFlow).toBeDefined();
        expect(pinAuthFlow.login).toBeDefined();
        expect(pinAuthFlow.logout).toBeDefined();
        expect(pinAuthFlow.isAuthenticated).toBeDefined();
        expect(pinAuthFlow.getManager).toBeDefined();
        expect(pinAuthFlow.getManager()).toBeDefined();
        expect(pinAuthFlow.getManager().enable).toBeDefined();
        expect(pinAuthFlow.getManager().disable).toBeDefined();
        expect(pinAuthFlow.getManager().changePin).toBeDefined();
        expect(pinAuthFlow.getManager().getEnabled).toBeDefined();
        done();
      });
    });

    describe('enable without proper local auth type.', function() {
      var enableErr;
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().enable()
          .catch(function(er) {
            enableErr = er;
          })
          .then(done)
          .catch(done);
      });
      it('throws error.', function(done) {
        window.TestUtil.verifyPluginError(enableErr, "P1014");
        done();
      });
    });

    describe('enable fingerprint when PIN is not.', function() {
      var enableErr;
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().enable(localAuthTypes.Fingerprint)
          .catch(function(er) {
            enableErr = er;
          })
          .then(done)
          .catch(done);
      });
      it('throws error.', function(done) {
        window.TestUtil.verifyPluginError(enableErr, "P1016");
        done();
      });
    });

    describe('enable and cancel the challenge', function() {
      var enableErr;
      beforeEach(function(done) {
        resetTest();
        isCancelFlow = true;
        currPin = undefined;
        newPin = "1234";

        pinAuthFlow.getManager().enable(localAuthTypes.PIN)
          .catch(function(er) {
            enableErr = er;
          })
          .then(done)
          .catch(done);
      });
      it('throws correct error code.', function(done) {
        window.TestUtil.verifyPluginError(enableErr, "10029");
        expect(challengeReasons.length).toBe(1);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        done();
      });
    });

    describe('disable invalid local auth type.', function() {
      var disableErr;
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().disable()
          .catch(function(er) {
            disableErr = er;
          })
          .then(done)
          .catch(done);
      });
      it('throws error.', function(done) {
        window.TestUtil.verifyPluginError(disableErr, "P1014");
        done();
      });
    });

    describe('authenticate without enabling.', function() {
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().getEnabled()
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(function() {
            currPin = "1234";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .catch(function(er) {
            loginResults.push(er);
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(done)
          .catch(done);
      });
      it('throws error.', function(done) {
        expect(enabledStates.length).toBe(2);
        expect(enabledStates[0].length).toBe(0);
        expect(enabledStates[1].length).toBe(0);

        expect(challengeReasons.length).toBe(0);

        expect(loginResults.length).toBe(1);
        window.TestUtil.verifyPluginError(loginResults[0], "P1013");
        done();
      });
    });

    describe('enable and authenticate and disable.', function() {
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().getEnabled()
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(function() {
            currPin = undefined;
            newPin = "1234";
            return pinAuthFlow.getManager().enable(localAuthTypes.PIN);
          })
          .then(function() {
            currPin = "1234";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .then(function(flow) {
            loginResults.push(true);
            return flow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
            return pinAuthFlow.getManager().disable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(done)
          .catch(done);
      });
      it('works correctly.', function(done) {
        expect(enabledStates.length).toBe(3);
        expect(enabledStates[0].length).toBe(0);
        expect(enabledStates[1].length).toBe(1);
        expect(enabledStates[1][0]).toBe(localAuthTypes.PIN);
        expect(enabledStates[2].length).toBe(0);

        expect(loginResults.length).toBe(1);
        expect(loginResults[0]).toBeTruthy();

        expect(challengeReasons.length).toBe(2);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.Login);

        done();
      });
    });

    describe('enable and enable again, authenticate and disable', function() {
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().getEnabled()
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(function() {
            currPin = undefined;
            newPin = "1234";
            return pinAuthFlow.getManager().enable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
            currPin = undefined;
            newPin = "1234";
            return pinAuthFlow.getManager().enable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
            currPin = "1234";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .then(function(flow) {
            loginResults.push(true);
            return flow.getManager().disable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(done)
          .catch(done);
      });
      it('works correctly.', function(done) {
        expect(enabledStates.length).toBe(4);
        expect(enabledStates[0].length).toBe(0);
        expect(enabledStates[1].length).toBe(1);
        expect(enabledStates[1][0]).toBe(localAuthTypes.PIN);
        expect(enabledStates[2].length).toBe(1);
        expect(enabledStates[2][0]).toBe(localAuthTypes.PIN);
        expect(enabledStates[3].length).toBe(0);

        expect(loginResults.length).toBe(1);
        expect(loginResults[0]).toBeTruthy();

        expect(challengeReasons.length).toBe(2);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.Login);
        done();
      });
    });

    describe('disable and authenticate then enable and authenticate and disable', function() {
      beforeEach(function(done) {
        resetTest();
        pinAuthFlow.getManager().getEnabled()
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(function() {
            return pinAuthFlow.getManager().disable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(function() {
            return pinAuthFlow.login();
          })
          .catch(function(er) {
            loginResults.push(er);
            currPin = undefined;
            newPin = "1234";
            return pinAuthFlow.getManager().enable(localAuthTypes.PIN);
          })
          .then(function() {
            currPin = "1234";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .then(function(flow) {
            loginResults.push(true);
            return flow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
            return pinAuthFlow.getManager().disable(localAuthTypes.PIN);
          })
          .then(function() {
            return pinAuthFlow.getManager().getEnabled();
          })
          .then(function(enabled) {
            enabledStates.push(enabled);
          })
          .then(done)
          .catch(done);
      });
      it('works correctly.', function(done) {
        expect(enabledStates.length).toBe(4);
        expect(enabledStates[0].length).toBe(0);
        expect(enabledStates[1].length).toBe(0);
        expect(enabledStates[2].length).toBe(1);
        expect(enabledStates[2][0]).toBe(localAuthTypes.PIN);
        expect(enabledStates[3].length).toBe(0);

        expect(challengeReasons.length).toBe(2);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.Login);

        expect(loginResults.length).toBe(2);
        window.TestUtil.verifyPluginError(loginResults[0], "P1013");
        expect(loginResults[1]).toBeTruthy();

        done();
      });
    });

    describe('enable, change pin and login again change pin and login and disable', function() {
      beforeEach(function(done) {
        resetTest();

        currPin = undefined;
        newPin = "1234";
        pinAuthFlow.getManager().enable(localAuthTypes.PIN)
          .then(function() {
            currPin = "1234";
            newPin = "2345";
            pinAuthFlow.getManager().changePin();
          })
          .then(function() {
            currPin = "2345";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .then(function(flow) {
            loginResults.push(true);
            currPin = "2345";
            newPin = "1234";
            return flow.getManager().changePin();
          })
          .then(function() {
            currPin = "1234";
            newPin = undefined;
            return pinAuthFlow.login();
          })
          .then(function(flow) {
            loginResults.push(true);
            return flow.getManager().disable(localAuthTypes.PIN);
          })
          .then(done)
          .catch(done);
      });
      it('works correctly.', function(done) {
        expect(loginResults.length).toBe(2);
        expect(loginResults[0]).toBeTruthy();
        expect(loginResults[1]).toBeTruthy();

        expect(challengeReasons.length).toBe(5);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.ChangePin);
        expect(challengeReasons[2]).toBe(pinChallengeReason.Login);
        expect(challengeReasons[3]).toBe(pinChallengeReason.ChangePin);
        expect(challengeReasons[4]).toBe(pinChallengeReason.Login);
        done();
      });
    });

    describe('enable, login and cancel the challenge, disable', function() {
      var loginErr;
      beforeEach(function(done) {
        resetTest();
        currPin = undefined;
        newPin = "1234";

        pinAuthFlow.getManager().enable(localAuthTypes.PIN)
          .then(function() {
            currPin = "1234";
            newPin = undefined;
            isCancelFlow = true;
            return pinAuthFlow.login();
          })
          .catch(function(er) {
            loginErr = er;
            return pinAuthFlow.getManager().disable(localAuthTypes.PIN);
          })
          .then(done)
          .catch(done);
      });
      it('throws correct error code.', function(done) {
        window.TestUtil.verifyPluginError(loginErr, "10029");
        expect(challengeReasons.length).toBe(2);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.Login);
        done();
      });
    });

    describe('change pin and cancel the challenge', function() {
      var changePinErr;
      beforeEach(function(done) {
        resetTest();
        currPin = undefined;
        newPin = "1234";

        pinAuthFlow.getManager().enable(localAuthTypes.PIN)
          .then(function() {
            currPin = "1234";
            newPin = "2345";
            isCancelFlow = true;
            return pinAuthFlow.getManager().changePin();
          })
          .catch(function(er) {
            changePinErr = er;
            return pinAuthFlow.getManager().disable(localAuthTypes.PIN);
          })
          .then(done)
          .catch(done);
      });
      it('throws correct error code.', function(done) {
        window.TestUtil.verifyPluginError(changePinErr, "10029");
        expect(challengeReasons.length).toBe(2);
        expect(challengeReasons[0]).toBe(pinChallengeReason.SetPin);
        expect(challengeReasons[1]).toBe(pinChallengeReason.ChangePin);
        done();
      });
    });
  });
};