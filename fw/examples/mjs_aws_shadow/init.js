// Load Mongoose OS API
load('api_aws.js');
load('api_gpio.js');

// Constants for ESP8266
// TODO: support other platforms
let LED_GPIO = 2;
let LED_OFF = 1;
let LED_ON = 0;
let BUTTON_GPIO = 0;
let BUTTON_PULL = GPIO.PULL_UP;
let BUTTON_EDGE = GPIO.INT_EDGE_POS;

let state = {
  foo: 0,
  bar: 0,
  ledOn: false,
};

function updateLed() {
  GPIO.write(LED_GPIO, state.ledOn ? LED_ON : LED_OFF);
}

function updateState(newSt) {
  if (newSt.foo !== undefined) {
    state.foo = newSt.foo;
  }
  if (newSt.bar !== undefined) {
    state.bar = newSt.bar;
  }
  if (newSt.ledOn !== undefined) {
    state.ledOn = newSt.ledOn;
  }
}

function reportState() {
  print('Reporting state:', JSON.stringify(state));
  AWS.Shadow.update(0, {
    reported: state,
  });
}

GPIO.set_mode(LED_GPIO, GPIO.MODE_OUTPUT);
updateLed();

GPIO.set_button_handler(
  BUTTON_GPIO, BUTTON_PULL, BUTTON_EDGE, 50 /*debounce ms*/,
  function(pin, ud) {
    let updRes = AWS.Shadow.update(0, {
      desired: {
        foo: state.foo + 1,
        ledOn: !state.ledOn,
      },
    });
    print("Click! Updated:", updRes);
  }, null
);

AWS.Shadow.setStateHandler(function(ud, ev, reported, desired, reported_md, desired_md) {
  print('Event:', ev, '('+AWS.Shadow.eventName(ev)+')');

  if (ev === AWS.Shadow.CONNECTED) {
    reportState();
    return;
  }

  if (ev !== AWS.Shadow.GET_ACCEPTED && ev !== AWS.Shadow.UPDATE_DELTA) {
    return;
  }

  print('Reported state:', JSON.stringify(reported));
  print('Desired state :', JSON.stringify(desired));

  /*
   * Here we extract values from previosuly reported state (if any)
   * and then override it with desired state (if present).
   */
  updateState(reported);
  updateState(desired);
  updateLed();

  print('New state:', JSON.stringify(state));

  if (ev === AWS.Shadow.UPDATE_DELTA) {
    reportState();
  }
}, null);
