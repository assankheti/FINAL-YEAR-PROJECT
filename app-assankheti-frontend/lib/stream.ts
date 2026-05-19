import Constants from 'expo-constants';
import { StreamChat } from 'stream-chat';

const extra = Constants.expoConfig?.extra ?? {};

export const STREAM_API_KEY = String(extra.STREAM_API_KEY || '');

export const chatClient = StreamChat.getInstance(STREAM_API_KEY || 'missing-stream-api-key');

export function parseStreamCid(cid: string) {
  const [type, ...rest] = cid.split(':');
  return { type, id: rest.join(':') };
}
