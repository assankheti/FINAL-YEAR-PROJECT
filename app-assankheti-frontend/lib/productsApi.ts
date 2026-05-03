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
