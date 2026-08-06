import { create } from 'zustand';

export type ViewName = 
  | 'landing' | 'login' | 'register' | 'verify-otp' | 'complete-profile'
  | 'dashboard' | 'activate' | 'deposit'
  | 'ads' | 'tasks' | 'market' | 'referral' | 'withdraw'
  | 'notifications' | 'profile' | 'settings'
  | 'admin-dashboard' | 'admin-users' | 'admin-activation-codes' | 'admin-deposit-codes'
  | 'admin-ads' | 'admin-tasks' | 'admin-withdrawals' | 'admin-announcements' | 'admin-analytics' | 'admin-referrals';

interface UserData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  isActivated: boolean;
  activatedAt: string | null;
  referralCode: string;
  profilePicture: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  createdAt: string;
}

interface WalletData {
  reward: number;
  deposit: number;
  profit: number;
}

// Incremented on every login/logout to cancel stale async init fetches
let sessionGeneration = 0;

interface AppState {
  view: ViewName;
  setView: (v: ViewName) => void;
  user: UserData | null;
  setUser: (u: UserData | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  wallets: WalletData;
  setWallets: (w: WalletData) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'landing',
  setView: (v) => set({ view: v }),
  user: null,
  setUser: (u) => set({ user: u }),
  token: null,
  setToken: () => {
    // No-op: Clerk manages sessions via cookies, no localStorage token needed.
    // Kept for interface compatibility.
  },
  wallets: { reward: 0, deposit: 0, profit: 0 },
  setWallets: (w) => set({ wallets: w }),
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  sidebarOpen: false,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  logout: () => {
    sessionGeneration++;
    set({ user: null, token: null, view: 'landing', wallets: { reward: 0, deposit: 0, profit: 0 } });
  },
}));

/**
 * Initialize store — check session via Clerk cookie (no localStorage token).
 * Called once on app mount.
 */
export function initializeStore() {
  const myGeneration = sessionGeneration;

  fetch('/api/auth/session')
    .then((r) => r.json())
    .then((data) => {
      // Guard: discard if a new login/logout happened while we were fetching
      if (myGeneration !== sessionGeneration) return;

      if (data.user) {
        useAppStore.getState().setUser(data.user);
        if (data.user.role === 'admin') {
          useAppStore.getState().setView('admin-dashboard');
        } else if (!data.user.isActivated) {
          useAppStore.getState().setView('activate');
        } else {
          useAppStore.getState().setView('dashboard');
        }
      }
      // If no user (not authenticated), stay on landing view (default)
    })
    .catch(() => {
      // Stay on login view
    });
}

/**
 * API fetch helper — no Bearer token needed, Clerk sends session via cookies.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(endpoint, { ...options, headers });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid response from server' : `Server error (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
