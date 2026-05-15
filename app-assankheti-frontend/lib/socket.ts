import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

import { API_BASE } from '../config/env';

let _socket: Socket | null = null;
let _lastConnectErrorLogAt = 0;

function attachLifecycleLogs(socket: Socket): void {
  socket.on('connect', () => {
    console.log('[socket] connected', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    const now = Date.now();
    if (now - _lastConnectErrorLogAt < 30000) return;

    _lastConnectErrorLogAt = now;
    console.warn('[socket] connect_error', err?.message ?? err);
  });
  socket.on('error', (payload) => {
    console.warn('[socket] error', payload);
  });
}

export async function connectSocket(): Promise<Socket> {
  if (_socket && _socket.connected) return _socket;

  const token = await AsyncStorage.getItem('auth.access_token');
  if (!token) throw new Error('connectSocket: not authenticated');

  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }

  const socket = io(API_BASE, {
    auth: { token },
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  attachLifecycleLogs(socket);
  _socket = socket;
  return socket;
}

export function getSocket(): Socket | null {
  return _socket;
}

export function disconnectSocket(): void {
  if (!_socket) return;
  _socket.removeAllListeners();
  _socket.disconnect();
  _socket = null;
}
