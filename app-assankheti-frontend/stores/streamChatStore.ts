import { create } from 'zustand';

export type StreamRole = 'farmer' | 'customer' | 'admin';

type StreamChatState = {
  userId: string | null;
  role: StreamRole | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  setConnecting: (isConnecting: boolean) => void;
  setConnected: (input: { userId: string; role: StreamRole }) => void;
  setDisconnected: () => void;
  setError: (error: string | null) => void;
};

export const useStreamChatStore = create<StreamChatState>((set) => ({
  userId: null,
  role: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  setConnecting: (isConnecting) => set({ isConnecting }),
  setConnected: ({ userId, role }) =>
    set({ userId, role, isConnected: true, isConnecting: false, error: null }),
  setDisconnected: () =>
    set({ userId: null, role: null, isConnected: false, isConnecting: false }),
  setError: (error) => set({ error, isConnecting: false }),
}));
