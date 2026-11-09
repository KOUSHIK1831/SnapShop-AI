import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/apiClient';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    globalSocket = io(socketUrl, {
      path: '/socket.io',
      autoConnect: false,
      auth: cb => {
        cb({ token: getAccessToken() });
      },
      transports: ['websocket', 'polling'],
    });
  }
  return globalSocket;
}

export function useSocketEvent(
  event: string,
  handler: (...args: any[]) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const listener = (...args: any[]) => {
      handlerRef.current(...args);
    };

    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
