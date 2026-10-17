import { useEffect, useRef } from 'react';

import { getRealtimeConfig, realtimeAuth } from '../services/flyerApi.ts';

type Handlers = Record<string, (data: unknown) => void>;

/**
 * Avisos em tempo real no canal da própria pessoa (`private-user-{id}`, Pusher).
 *
 * O backend diz se o tempo real está ligado (`/realtime/config`) e assina a
 * inscrição no canal (`/realtime/auth`, só o próprio). O `pusher-js` só é baixado
 * aqui. Sem tempo real, nada acontece: as telas que dependem disto consultam o
 * backend de tempos em tempos.
 */
export function useUserChannel(userId: string | null, handlers: Handlers): void {
  // Os handlers mais recentes, sem religar a cada render de quem chama.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let teardown: (() => void) | null = null;

    void (async () => {
      try {
        const config = await getRealtimeConfig();
        if (cancelled || !config.enabled || !config.key || !config.cluster) return;
        const { default: Pusher } = await import('pusher-js');
        if (cancelled) return;
        const channelName = `private-user-${userId}`;
        const pusher = new Pusher(config.key, {
          cluster: config.cluster,
          channelAuthorization: {
            endpoint: '',
            transport: 'ajax',
            customHandler: (params, callback) => {
              realtimeAuth(params.socketId, params.channelName)
                .then((data) => callback(null, data))
                .catch((err: unknown) =>
                  callback(err instanceof Error ? err : new Error('realtime auth failed'), null),
                );
            },
          },
        });
        const channel = pusher.subscribe(channelName);
        for (const event of Object.keys(handlersRef.current)) {
          channel.bind(event, (data: unknown) => handlersRef.current[event]?.(data));
        }
        teardown = () => {
          channel.unbind_all();
          pusher.unsubscribe(channelName);
          pusher.disconnect();
        };
      } catch {
        /* sem tempo real: a tela continua com a consulta periódica */
      }
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [userId]);
}
