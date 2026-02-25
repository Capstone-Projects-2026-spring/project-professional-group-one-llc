/**
 * movementSensor.test.js
 */

jest.useFakeTimers();

let mockAddListener;
let mockSetUpdateInterval;
let mockRemove;
let capturedListener = null;

jest.mock('expo-sensors', () => {
  mockRemove = jest.fn();

  mockAddListener = jest.fn((cb) => {
    capturedListener = cb;
    return { remove: mockRemove };
  });

  mockSetUpdateInterval = jest.fn();

  return {
    Accelerometer: {
      addListener: mockAddListener,
      setUpdateInterval: mockSetUpdateInterval,
    },
  };
});

describe('movementSensor', () => {
  let logSpy;
  let mod; // module under test

  const loadFreshModule = () => {
    // Ensure a clean module state (because movementSensor has top-level side effects)
    capturedListener = null;
    jest.resetModules();

    // isolateModules ensures the require below runs in an isolated module registry
    jest.isolateModules(() => {
      mod = require('../src/hooks/movementSensor');
    });

    return mod;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    loadFreshModule();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('registers accelerometer listener and sets update interval on import', () => {
    // This test checks that importing the module configures accelerometer polling
    // and registers the update callback with Accelerometer.addListener.
    expect(mockSetUpdateInterval).toHaveBeenCalledTimes(1);
    expect(mockSetUpdateInterval).toHaveBeenCalledWith(100);

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(typeof capturedListener).toBe('function');
  });

  test('stop() removes the accelerometer subscription', () => {
    // This test verifies stop() calls subscription.remove() (prevents leaks / extra listeners).
    mod.stop();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  test('does NOT scan when the device is still but movement was never armed', () => {
    // This test ensures stillness does not trigger scanning unless scan was armed
    // (arming should only happen after reaching the target travel distance).
    capturedListener({ x: 0.1, y: 0.1, z: 0.1 });

    // Even after STILLNESS_TIMEOUT has passed, scan should not happen (never armed)
    jest.advanceTimersByTime(1000);

    expect(logSpy).not.toHaveBeenCalledWith('[BLE] Scanning for nearby devices...');
  });

  test('after being armed, going still triggers a scan after the stillness timeout', () => {
    // This test validates:
    // 1) movement reaches target distance -> scan gets armed
    // 2) going still starts a timer
    // 3) staying still long enough triggers a BLE scan
    //
    // NOTE: This assumes your movementSensor logic updates timestamps to accumulate distance.
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    // initial movement sample
    now = 0;
    capturedListener({ x: 2, y: 0, z: 0 });

    // repeated movement to exceed target distance (5m)
    for (let i = 1; i <= 40; i++) {
      now = i * 200;
      capturedListener({ x: 2, y: 0, z: 0 });
    }

    expect(logSpy).toHaveBeenCalledWith(
      '[Tracker] 5m reached — will scan when device stops.'
    );

    // now go still to start the stillness countdown
    now += 100;
    capturedListener({ x: 0.1, y: 0.1, z: 0.1 });

    // before timeout: no scan
    expect(logSpy).not.toHaveBeenCalledWith('[BLE] Scanning for nearby devices...');

    // after timeout: scan should fire
    jest.advanceTimersByTime(900);

    expect(logSpy).toHaveBeenCalledWith('[BLE] Scanning for nearby devices...');
  });

  test('if movement resumes, it cancels the stillness timer (no scan)', () => {
    // This test ensures the scan timer is canceled if movement resumes before the timeout completes,
    // preventing a scan from happening while the device is moving again.
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    // arm scanning via movement
    now = 0;
    capturedListener({ x: 2, y: 0, z: 0 });

    for (let i = 1; i <= 40; i++) {
      now = i * 200;
      capturedListener({ x: 2, y: 0, z: 0 });
    }

    expect(logSpy).toHaveBeenCalledWith(
      '[Tracker] 5m reached — will scan when device stops.'
    );

    // start stillness timer
    now += 100;
    capturedListener({ x: 0.1, y: 0.1, z: 0.1 });

    // resume movement before STILLNESS_TIMEOUT expires -> cancels timer
    now += 200;
    capturedListener({ x: 2, y: 0, z: 0 });

    // even after timeout passes, scan should not happen
    jest.advanceTimersByTime(1000);

    expect(logSpy).not.toHaveBeenCalledWith('[BLE] Scanning for nearby devices...');
  });
});