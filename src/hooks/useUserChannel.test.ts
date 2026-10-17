import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserChannel } from './useUserChannel.ts';

const getRealtimeConfig = vi.hoisted(() => vi.fn());
const realtimeAuth = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getRealtimeConfig, realtimeAuth }));

type Handler = (data: unknown) => void;
type Authorize = (
  params: { socketId: string; channelName: string },
  callback: (error: Error | null, data: { auth: string } | null) => void,
) => void;

const fake = vi.hoisted(() => ({
  instances: [] as Array<{
    key: string;
    options: { cluster: string; channelAuthorization: { customHandler: Authorize } };
    subscribed: string[];
    unsubscribed: string[];
    handlers: Map<string, Handler>;
    disconnected: boolean;
  }>,
}));

vi.mock('pusher-js', () => ({
  default: class FakePusher {
    key: string;
    options: { cluster: string; channelAuthorization: { customHandler: Authorize } };
    subscribed: string[] = [];
    unsubscribed: string[] = [];
    handlers = new Map<string, Handler>();
    disconnected = false;

    constructor(key: string, options: FakePusher['options']) {
      this.key = key;
      this.options = options;
      fake.instances.push(this);
    }

    subscribe(name: string) {
      this.subscribed.push(name);
      return {
        bind: (event: string, handler: Handler) => this.handlers.set(event, handler),
        unbind_all: () => this.handlers.clear(),
      };
    }

    unsubscribe(name: string) {
      this.unsubscribed.push(name);
    }

    disconnect() {
      this.disconnected = true;
    }
  },
}));

describe('useUserChannel', () => {
  beforeEach(() => {
    fake.instances.length = 0;
    getRealtimeConfig.mockReset();
    realtimeAuth.mockReset();
    getRealtimeConfig.mockResolvedValue({ enabled: true, key: 'pk', cluster: 'sa1' });
  });

  it('ouve o canal da própria pessoa e entrega os eventos', async () => {
    const onCheckin = vi.fn();

    renderHook(() => useUserChannel('user-1', { 'checkin:done': onCheckin }));

    await waitFor(() => expect(fake.instances).toHaveLength(1));
    const pusher = fake.instances[0];
    expect(pusher.key).toBe('pk');
    expect(pusher.options.cluster).toBe('sa1');
    expect(pusher.subscribed).toEqual(['private-user-user-1']);

    pusher.handlers.get('checkin:done')?.({ event_id: 'evt-1' });
    expect(onCheckin).toHaveBeenCalledWith({ event_id: 'evt-1' });
  });

  it('pede a autorização do canal ao backend', async () => {
    realtimeAuth.mockResolvedValue({ auth: 'pk:sig' });
    renderHook(() => useUserChannel('user-1', {}));
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    const callback = vi.fn();

    fake.instances[0].options.channelAuthorization.customHandler(
      { socketId: '1.2', channelName: 'private-user-user-1' },
      callback,
    );

    await waitFor(() => expect(callback).toHaveBeenCalledWith(null, { auth: 'pk:sig' }));
    expect(realtimeAuth).toHaveBeenCalledWith('1.2', 'private-user-user-1');
  });

  it('desliga tudo ao sair', async () => {
    const { unmount } = renderHook(() => useUserChannel('user-1', {}));
    await waitFor(() => expect(fake.instances).toHaveLength(1));

    unmount();

    expect(fake.instances[0].unsubscribed).toEqual(['private-user-user-1']);
    expect(fake.instances[0].disconnected).toBe(true);
  });

  it('não liga nada com o tempo real desligado no backend', async () => {
    getRealtimeConfig.mockResolvedValue({ enabled: false, key: null, cluster: null });

    renderHook(() => useUserChannel('user-1', {}));

    await waitFor(() => expect(getRealtimeConfig).toHaveBeenCalled());
    expect(fake.instances).toHaveLength(0);
  });

  it('não liga nada sem sessão', () => {
    renderHook(() => useUserChannel(null, {}));

    expect(getRealtimeConfig).not.toHaveBeenCalled();
  });

  it('uma falha ao ler a configuração não quebra a tela', async () => {
    getRealtimeConfig.mockRejectedValue(new Error('offline'));

    renderHook(() => useUserChannel('user-1', {}));

    await waitFor(() => expect(getRealtimeConfig).toHaveBeenCalled());
    expect(fake.instances).toHaveLength(0);
  });
});
