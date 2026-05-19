import { authFetch } from '@/lib/authFetch';
import type { StreamRole } from '@/stores/streamChatStore';

export type StreamTokenResponse = {
  api_key: string;
  app_id?: string;
  token: string;
  user: {
    id: string;
    name: string;
    role: StreamRole;
    mobile_id: string;
  };
};

export type StreamChannelResponse = {
  cid: string;
  id: string;
  type: string;
};

function roleForAppRole(role?: string | null): StreamRole {
  if (role === 'farmer') return 'farmer';
  if (role === 'admin') return 'admin';
  return 'customer';
}

export async function createStreamToken(input: {
  name?: string | null;
  role?: string | null;
}): Promise<StreamTokenResponse> {
  const res = await authFetch('/api/v1/stream/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name || undefined,
      role: roleForAppRole(input.role),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || `Stream token failed (${res.status})`);
  return json as StreamTokenResponse;
}

export async function createDirectStreamChannel(input: {
  memberId: string;
  memberName?: string;
  contextType?: string;
  contextRef?: string;
}): Promise<StreamChannelResponse> {
  const res = await authFetch('/api/v1/stream/channels/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member_id: input.memberId,
      member_name: input.memberName,
      context_type: input.contextType,
      context_ref: input.contextRef,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || `Channel create failed (${res.status})`);
  return json as StreamChannelResponse;
}

export async function createCommunityStreamChannel(input: {
  channelId: string;
  name: string;
  crop?: string;
}): Promise<StreamChannelResponse> {
  const res = await authFetch('/api/v1/stream/channels/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel_id: input.channelId,
      name: input.name,
      crop: input.crop,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || `Community channel failed (${res.status})`);
  return json as StreamChannelResponse;
}
