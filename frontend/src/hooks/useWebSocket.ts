import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { CodeChange, LanguageChange, UserPresence, RoomState } from '../types';

interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  username: string;
  onCodeChange: (change: CodeChange) => void;
  onLanguageChange: (change: LanguageChange) => void;
  onPresenceChange: (presence: UserPresence) => void;
  onStateSync: (state: RoomState) => void;
}

export function useWebSocket({
  roomId,
  userId,
  username,
  onCodeChange,
  onLanguageChange,
  onPresenceChange,
  onStateSync,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  // Use refs for callbacks to avoid reconnecting on every render
  const callbacksRef = useRef({ onCodeChange, onLanguageChange, onPresenceChange, onStateSync });
  callbacksRef.current = { onCodeChange, onLanguageChange, onPresenceChange, onStateSync };

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const client = new Client({
      brokerURL: `${wsProtocol}//${window.location.host}/ws/websocket`,
      reconnectDelay: 2000,
      onConnect: () => {
        setConnected(true);

        client.subscribe(`/topic/room/${roomId}/code`, (message) => {
          const change: CodeChange = JSON.parse(message.body);
          if (change.userId !== userId) {
            callbacksRef.current.onCodeChange(change);
          }
        });

        client.subscribe(`/topic/room/${roomId}/language`, (message) => {
          const change: LanguageChange = JSON.parse(message.body);
          callbacksRef.current.onLanguageChange(change);
        });

        client.subscribe(`/topic/room/${roomId}/presence`, (message) => {
          const presence: UserPresence = JSON.parse(message.body);
          callbacksRef.current.onPresenceChange(presence);
        });

        client.subscribe(`/topic/room/${roomId}/state`, (message) => {
          const state: RoomState = JSON.parse(message.body);
          callbacksRef.current.onStateSync(state);
        });

        // Announce join
        client.publish({
          destination: `/app/room/${roomId}/join`,
          body: JSON.stringify({ userId, username }),
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.connected) {
        client.publish({
          destination: `/app/room/${roomId}/leave`,
          body: JSON.stringify({ userId, username }),
        });
      }
      client.deactivate();
    };
  }, [roomId, userId, username]);

  const sendCodeChange = useCallback(
    (content: string) => {
      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: `/app/room/${roomId}/code`,
          body: JSON.stringify({ userId, content }),
        });
      }
    },
    [roomId, userId]
  );

  const sendLanguageChange = useCallback(
    (language: string) => {
      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: `/app/room/${roomId}/language`,
          body: JSON.stringify({ userId, language }),
        });
      }
    },
    [roomId, userId]
  );

  return { connected, sendCodeChange, sendLanguageChange };
}
