import { create } from 'zustand';

export type ViewName = 
  | 'login' | 'register' | 'verify-otp'
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

interface PendingRegistration {
  email: string;
  password: string;
  fullName: string;
  username: string;
  phone: string;
}

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
  pendingRegistration: PendingRegistration | null;
  setPendingRegistration: (p: PendingRegistration | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'login',
  setView: (v) => set({ view: v }),
  user: null,
  setUser: (u) => set({ user: u }),
  token: null,
  setToken: (t) => {
    if (t) localStorage.setItem('alcoin_token', t);
    else localStorage.removeItem('alcoin_token');
    set({ token: t });
  },
  wallets: { reward: 0, deposit: 0, profit: 0 },
  setWallets: (w) => set({ wallets: w }),
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  sidebarOpen: false,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  pendingRegistration: null,
  setPendingRegistration: (p) => set({ pendingRegistration: p }),
  logout: () => {
    localStorage.removeItem('alcoin_token');
    set({ user: null, token: null, view: 'login', wallets: { reward: 0, deposit: 0, profit: 0 } });
  },
}));

export function initializeStore() {
  const token = localStorage.getItem('alcoin_token');
  if (token) {
    useAppStore.getState().setToken(token);
    fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          useAppStore.getState().setUser(data.user);
          useAppStore.getState().setView(data.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        } else {
          useAppStore.getState().logout();
        }
      })
      .catch(() => useAppStore.getState().logout());
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = useAppStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
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