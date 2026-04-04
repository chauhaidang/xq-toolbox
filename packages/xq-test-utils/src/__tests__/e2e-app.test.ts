import { App } from '../e2e/app';

const mockLaunchApp = jest.fn().mockResolvedValue(undefined);
const mockTerminateApp = jest.fn().mockResolvedValue(undefined);
const mockSendToHome = jest.fn().mockResolvedValue(undefined);
const mockActivateApp = jest.fn().mockResolvedValue(undefined);

beforeAll(() => {
  (globalThis as any).device = {
    launchApp: mockLaunchApp,
    terminateApp: mockTerminateApp,
    sendToHome: mockSendToHome,
    activateApp: mockActivateApp,
  };
});

afterAll(() => {
  delete (globalThis as any).device;
});

beforeEach(() => jest.clearAllMocks());

describe('App.launch', () => {
  it('calls device.launchApp with provided options', async () => {
    await App.launch({ newInstance: true, permissions: { notifications: 'YES' } });
    expect(mockLaunchApp).toHaveBeenCalledWith({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  it('calls device.launchApp with no args when called without options', async () => {
    await App.launch();
    expect(mockLaunchApp).toHaveBeenCalledWith(undefined);
  });
});

describe('App.reset', () => {
  it('launches with newInstance:true and delete:true', async () => {
    await App.reset();
    expect(mockLaunchApp).toHaveBeenCalledWith({ newInstance: true, delete: true });
  });

  it('merges extra options with the reset flags', async () => {
    await App.reset({ permissions: { camera: 'NO' } });
    expect(mockLaunchApp).toHaveBeenCalledWith({
      permissions: { camera: 'NO' },
      newInstance: true,
      delete: true,
    });
  });
});

describe('App.terminate', () => {
  it('calls device.terminateApp', async () => {
    await App.terminate();
    expect(mockTerminateApp).toHaveBeenCalledTimes(1);
  });
});

describe('App.relaunch', () => {
  it('terminates then launches', async () => {
    await App.relaunch({ newInstance: false });
    expect(mockTerminateApp).toHaveBeenCalledTimes(1);
    expect(mockLaunchApp).toHaveBeenCalledWith({ newInstance: false });
  });
});

describe('App.background', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('sends to home, waits, then activates', async () => {
    const p = App.background(1000);
    await Promise.resolve(); // flush microtasks so sendToHome resolves and setTimeout is registered
    jest.advanceTimersByTime(1000);
    await p;
    expect(mockSendToHome).toHaveBeenCalledTimes(1);
    expect(mockActivateApp).toHaveBeenCalledTimes(1);
  });
});
