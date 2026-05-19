import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect } from 'react';

import { APP_FLOW_KEYS, readAppFlowState } from '@/lib/appFlow';
import { createStreamToken } from '@/lib/streamApi';
import { chatClient, STREAM_API_KEY } from '@/lib/stream';
import { useStreamChatStore } from '@/stores/streamChatStore';

async function displayNameForCurrentUser() {
  const [[, farmerName], [, communityName], [, phone]] = await AsyncStorage.multiGet([
    'farmerProfile.name',
    'communityProfile.name',
    APP_FLOW_KEYS.phoneNumber,
  ]);
  return farmerName || communityName || phone || null;
}

export function useStreamChatConnection() {
  const { setConnected, setConnecting, setDisconnected, setError, ...state } = useStreamChatStore();

  const connect = useCallback(async () => {
    const accessToken = await AsyncStorage.getItem(APP_FLOW_KEYS.accessToken);
    if (!accessToken) {
      setDisconnected();
      return;
    }
    if (!STREAM_API_KEY) {
      setError('STREAM_API_KEY is missing from Expo config.');
      return;
    }

    setConnecting(true);
    try {
      const appState = await readAppFlowState();
      const name = await displayNameForCurrentUser();
      const tokenResponse = await createStreamToken({ name, role: appState.role });

      if (chatClient.userID === tokenResponse.user.id) {
        setConnected({ userId: tokenResponse.user.id, role: tokenResponse.user.role });
        return;
      }

      if (chatClient.userID) await chatClient.disconnectUser();
      await chatClient.connectUser(
        {
          id: tokenResponse.user.id,
          name: tokenResponse.user.name,
          role: tokenResponse.user.role,
          mobile_id: tokenResponse.user.mobile_id,
        } as any,
        tokenResponse.token
      );
      setConnected({ userId: tokenResponse.user.id, role: tokenResponse.user.role });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not connect to chat.');
    }
  }, [setConnected, setConnecting, setDisconnected, setError]);

  const disconnect = useCallback(async () => {
    if (chatClient.userID) await chatClient.disconnectUser();
    setDisconnected();
  }, [setDisconnected]);

  useEffect(() => {
    void connect();
  }, [connect]);

  return { ...state, connect, disconnect, client: chatClient };
}
