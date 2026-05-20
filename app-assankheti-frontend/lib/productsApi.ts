import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/config/env';
import { getOrCreateMobileId } from '@/lib/deviceId';

export type ProductCategory = 'grains' | 'veggies' | 'fruits' | 'others';
export type ProductUnit = 'kg' | 'g' | 'bag' | 'bundle' | 'piece' | 'dozen';
export type ProductStatus = 'active' | 'sold' | 'draft';

export type ProductListing = {
  id: string;
  farmer_id: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: ProductUnit;
  stock: number;
  min_order?: string | null;
  delivery_area?: string | null;
  description?: string | null;
  images: string[];
  status: ProductStatus;
  views: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductPayload = {
  farmer_id?: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: ProductUnit;
  stock: number;
  min_order?: string;
  delivery_area?: string;
  description?: string;
  images?: string[];
  status?: ProductStatus;
};

function slugifyProductTerm(value?: string | null): string {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ',')
    .replace(/^,+|,+$/g, '');
  return cleaned || 'farm,produce';
}

export function normalizeProductImageUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith('http') || uri.startsWith('file:') || uri.startsWith('data:') || uri.startsWith('blob:')) return uri;
  if (uri.startsWith('/')) return `${API_BASE}${uri}`;
  return uri;
}

export function productFallbackImage(name?: string | null, category?: string | null): string {
  const tags = slugifyProductTerm(name) || slugifyProductTerm(category);
  const lockBase = `${name ?? ''}-${category ?? ''}`;
  const lock = Array.from(lockBase).reduce((sum, char) => sum + char.charCodeAt(0), 0) || 999;
  return `https://loremflickr.com/640/480/${tags}?lock=${lock}`;
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function apiRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const json = parseJson(text);

  if (!res.ok) {
    const message = json?.detail || json?.message || text || `Request failed (${res.status})`;
    throw new Error(String(message));
  }

  return json;
}

export async function getProductOwnerId() {
  const userId = await AsyncStorage.getItem('auth.user_id');
  if (userId) return userId;

  const mobileId = await getOrCreateMobileId();
  return `device:${mobileId}`;
}

export async function listFarmerProducts(farmerId: string): Promise<ProductListing[]> {
  const json = await apiRequest(`/api/v1/products/farmer/${encodeURIComponent(farmerId)}`);
  return (json?.data ?? []) as ProductListing[];
}

export async function listAllProducts(input?: {
  category?: string | null;
  status?: ProductStatus | null;
  limit?: number;
}): Promise<ProductListing[]> {
  const params = new URLSearchParams();
  if (input?.category) params.set('category', input.category);
  if (input?.status) params.set('status', input.status);
  if (input?.limit) params.set('limit', String(input.limit));

  const query = params.toString();
  const json = await apiRequest(`/api/v1/products/all${query ? `?${query}` : ''}`);
  return (json?.data ?? []) as ProductListing[];
}

export async function getProduct(productId: string): Promise<ProductListing> {
  const json = await apiRequest(`/api/v1/products/${encodeURIComponent(productId)}`);
  return json.data as ProductListing;
}

export async function createProduct(payload: ProductPayload): Promise<ProductListing> {
  const json = await apiRequest('/api/v1/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json.data as ProductListing;
}

export async function updateProduct(productId: string, payload: Partial<ProductPayload>): Promise<ProductListing> {
  const json = await apiRequest(`/api/v1/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return json.data as ProductListing;
}

export async function deleteProduct(productId: string) {
  await apiRequest(`/api/v1/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}
