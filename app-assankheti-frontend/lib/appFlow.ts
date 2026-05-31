import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatClient } from '@/lib/stream';
import { useStreamChatStore } from '@/stores/streamChatStore';

export type AppRole = 'farmer' | 'businessman' | 'simple-user';
export type AppLanguage = 'english' | 'urdu';

export type AppFlowState = {
  termsAccepted: boolean;
  languageSelected: boolean;
  textLanguage: AppLanguage | null;
  voiceLanguage: AppLanguage | null;
  role: AppRole | null;
  selectedCrop: string | null;
  isAuthenticated: boolean;
};

export type RouteTarget = string | { pathname: string; params?: Record<string, string> };

export const APP_FLOW_KEYS = {
  termsAccepted: 'assanKheti.termsAccepted.v1',
  languageSelected: 'assanKheti.languageSelected.v1',
  textLanguage: 'assanKheti.textLanguage.v1',
  voiceLanguage: 'assanKheti.voiceLanguage.v1',
  role: 'assanKheti.role.v1',
  selectedCrop: 'assanKheti.selectedCrop.v1',
  accessToken: 'auth.access_token',
  tokenType: 'auth.token_type',
  userId: 'auth.user_id',
  phoneNumber: 'auth.phone_number',
  otpMethodId: 'auth.otp_method_id',
} as const;

const FARMER_ONLY_PREFIXES = [
  '/farmer-dashboard',
  '/farmer/',
  '/crop-selection',
  '/farmer-products',
  '/add-product',
  '/farmer-orders',
  '/farmer-notifications',
  '/farmer-settings',
  '/farmer-profile-edit',
  '/disease-detection',
  '/smart-budget',
  '/crop-recommendations',
  '/product-actions',
];

const FARMER_MARKETPLACE_PREFIXES = [
  '/farmer/community',
  '/farmer-products',
  '/add-product',
  '/product-actions',
];

const SHARED_AUTH_PREFIXES = [
  '/stream-chat',
];

const SHARED_MARKETPLACE_PREFIXES = [
  '/category-products',
  '/product-buy',
  '/product/',
  '/order-details',
  '/payment',
  '/payment-success',
  '/payment-cancel',
];

const COMMUNITY_ONLY_PREFIXES = [
  '/community-dashboard',
  '/community/',
  '/category-products',
  '/product-buy',
  '/product/',
  '/user-orders',
  '/user-notifications',
  '/payment',
  '/payment-success',
  '/payment-cancel',
  '/community-settings',
  '/call',
  '/order-details',
];

const PUBLIC_PREFIXES = [
  '/',
  '/splash',
  '/terms',
  '/terms-and-conditions',
  '/language',
  '/language-selection',
  '/characteristics',
  '/user-type-selection',
  '/auth/login',
  '/auth/register',
  '/login',
  '/verify-otp',
  '/privacy-policy',
  '/help-center',
];

function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  if (value === 'english' || value === 'urdu') return value;
  if (value === 'en') return 'english';
  if (value === 'ur') return 'urdu';
  return null;
}

export function normalizeRole(value: string | null | undefined): AppRole | null {
  if (value === 'farmer' || value === 'businessman' || value === 'simple-user') return value;
  if (value === 'business-user' || value === 'business') return 'businessman';
  if (value === 'user') return 'simple-user';
  return null;
}

function route(pathname: string, params?: Record<string, string>): RouteTarget {
  return params ? { pathname, params } : pathname;
}

function roleParams(role: AppRole | null, state?: Pick<AppFlowState, 'textLanguage' | 'voiceLanguage'>) {
  const params: Record<string, string> = {};
  if (role) params.userType = role;
  if (state?.textLanguage) params.textLanguage = state.textLanguage;
  if (state?.voiceLanguage) params.voiceLanguage = state.voiceLanguage;
  return params;
}

export async function readAppFlowState(): Promise<AppFlowState> {
  const entries = await AsyncStorage.multiGet(Object.values(APP_FLOW_KEYS));
  const values = Object.fromEntries(entries);
  const textLanguage = normalizeLanguage(values[APP_FLOW_KEYS.textLanguage]);
  const voiceLanguage = normalizeLanguage(values[APP_FLOW_KEYS.voiceLanguage]);

  return {
    termsAccepted: values[APP_FLOW_KEYS.termsAccepted] === 'true',
    languageSelected: values[APP_FLOW_KEYS.languageSelected] === 'true' || Boolean(textLanguage || voiceLanguage),
    textLanguage,
    voiceLanguage,
    role: normalizeRole(values[APP_FLOW_KEYS.role]),
    selectedCrop: values[APP_FLOW_KEYS.selectedCrop] || null,
    isAuthenticated: Boolean(values[APP_FLOW_KEYS.accessToken]),
  };
}

export async function setTermsAcceptedLocal(accepted = true) {
  await AsyncStorage.setItem(APP_FLOW_KEYS.termsAccepted, String(accepted));
}

export async function setLanguageSelectedLocal(textLanguage: AppLanguage, voiceLanguage: AppLanguage) {
  await AsyncStorage.multiSet([
    [APP_FLOW_KEYS.languageSelected, 'true'],
    [APP_FLOW_KEYS.textLanguage, textLanguage],
    [APP_FLOW_KEYS.voiceLanguage, voiceLanguage],
  ]);
}

export async function setStoredRole(role: AppRole) {
  await AsyncStorage.setItem(APP_FLOW_KEYS.role, role);
}

export async function setStoredSelectedCrop(crop: string) {
  await AsyncStorage.setItem(APP_FLOW_KEYS.selectedCrop, crop);
}

export async function persistAuthSession(input: {
  accessToken: string;
  tokenType?: string;
  userId?: string | number | null;
  phoneNumber?: string | null;
  role?: AppRole | null;
}) {
  const entries: [string, string][] = [
    [APP_FLOW_KEYS.accessToken, input.accessToken],
    [APP_FLOW_KEYS.tokenType, input.tokenType || 'bearer'],
  ];

  if (input.userId) entries.push([APP_FLOW_KEYS.userId, String(input.userId)]);
  if (input.phoneNumber) entries.push([APP_FLOW_KEYS.phoneNumber, input.phoneNumber]);
  if (input.role) entries.push([APP_FLOW_KEYS.role, input.role]);

  await AsyncStorage.multiSet(entries);
}

export async function clearAuthSession() {
  try {
    if (chatClient.userID) await chatClient.disconnectUser();
    useStreamChatStore.getState().setDisconnected();
  } catch {
    // Auth state should still clear even if the chat socket is already gone.
  }

  await AsyncStorage.multiRemove([
    APP_FLOW_KEYS.accessToken,
    APP_FLOW_KEYS.tokenType,
    APP_FLOW_KEYS.userId,
    APP_FLOW_KEYS.phoneNumber,
    APP_FLOW_KEYS.otpMethodId,
  ]);
}

export function getCommunityDashboardRoute(role: AppRole | null, state?: Pick<AppFlowState, 'textLanguage' | 'voiceLanguage'>) {
  const dashboardRole = role === 'businessman' ? 'businessman' : 'simple-user';
  return route('/community-dashboard', roleParams(dashboardRole, state));
}

export function getStartupRoute(state: AppFlowState): RouteTarget {
  if (!state.termsAccepted) return '/terms-and-conditions';
  if (!state.languageSelected) return '/language-selection';
  if (!state.role) return '/user-type-selection';

  if (state.role === 'farmer') {
    if (!state.selectedCrop) return route('/crop-selection', roleParams(state.role, state));
    // Authenticated farmer → go straight to the marketplace/community dashboard
    if (state.isAuthenticated) return route('/farmer/community', roleParams(state.role, state));
    // Non-authenticated farmer → features hub (disease detection, crop rec, AI chat, marketplace)
    return route('/farmer-dashboard', {
      ...roleParams(state.role, state),
      selectedCrop: state.selectedCrop,
    });
  }

  if (!state.isAuthenticated) return route('/login', roleParams(state.role, state));
  return getCommunityDashboardRoute(state.role, state);
}

export function getRedirectForPath(pathname: string, state: AppFlowState): RouteTarget | null {
  if (pathname === '/' || pathname === '/splash') return null;

  const startupRoute = getStartupRoute(state);
  const startupPath = typeof startupRoute === 'string' ? startupRoute : startupRoute.pathname;
  const isPublicPath = PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isLoginPath = pathname === '/login' || pathname === '/auth/login' || pathname === '/auth/register' || pathname === '/verify-otp';

  if ((!state.termsAccepted || !state.languageSelected || !state.role) && pathname !== startupPath) {
    return startupRoute;
  }

  if (isLoginPath) {
    if (state.role === 'farmer') return state.isAuthenticated ? route('/farmer/community', roleParams(state.role, state)) : null;
    if (state.role && state.isAuthenticated) return getCommunityDashboardRoute(state.role, state);
    return null;
  }

  if (isPublicPath) return null;

  const isFarmerOnly = FARMER_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isCommunityOnly = COMMUNITY_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isSharedAuthOnly = SHARED_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isSharedMarketplace = SHARED_MARKETPLACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isSharedAuthOnly) {
    if (!state.role) return startupRoute;
    if (state.role === 'farmer' && !state.selectedCrop) return route('/crop-selection', roleParams(state.role, state));
    if (!state.isAuthenticated) return route('/login', roleParams(state.role, state));
    return null;
  }

  if (isSharedMarketplace) {
    if (!state.role) return startupRoute;
    if (state.role === 'farmer' && !state.selectedCrop) return route('/crop-selection', roleParams(state.role, state));
    if (!state.isAuthenticated) return route('/login', roleParams(state.role, state));
    return null;
  }

  if (isFarmerOnly) {
    if (state.role !== 'farmer') return startupRoute;
    if (pathname !== '/crop-selection' && !state.selectedCrop) return route('/crop-selection', roleParams(state.role, state));
    const requiresMarketplaceAuth = FARMER_MARKETPLACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (requiresMarketplaceAuth && !state.isAuthenticated) return route('/login', roleParams(state.role, state));
    return null;
  }

  if (isCommunityOnly) {
    if (state.role === 'farmer') return route('/farmer/community', roleParams(state.role, state));
    if (!state.role) return startupRoute;
    if (!state.isAuthenticated) return route('/login', roleParams(state.role, state));
    return null;
  }

  return null;
}
