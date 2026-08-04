import { supabaseAdmin } from './supabase/admin';

// ============================================================
// Helper: map a snake_case profile row to the app's camelCase format
// ============================================================
export function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email || '',
    phone: row.phone,
    role: row.role,
    isActivated: Boolean(row.is_activated),
    activatedAt: row.activated_at,
    referralCode: row.referral_code,
    profilePicture: row.profile_picture,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    bankAccountName: row.bank_account_name,
    createdAt: row.created_at,
  };
}

// ============================================================
// Helper: insert audit log
// ============================================================
export async function insertAuditLog(userId: string, action: string, details?: string) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    action,
    details: details || null,
  });
}

// ============================================================
// Helper: insert notification
// ============================================================
export async function insertNotification(userId: string, title: string, message: string, type: string = 'info') {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
  });
}

// ============================================================
// Helper: get or create wallets for a user
// ============================================================
export async function ensureWallets(userId: string) {
  const { data: existing } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', userId);

  if (existing && existing.length > 0) return existing;

  const types = ['reward', 'deposit', 'profit'];
  const inserts = types.map((type) => ({ user_id: userId, type, balance: 0 }));
  await supabaseAdmin.from('wallets').insert(inserts);

  const { data } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

// ============================================================
// Helper: get user wallets as { reward, deposit, profit }
// ============================================================
export async function getWallets(userId: string) {
  const rows = await ensureWallets(userId);
  const wallets = { reward: 0, deposit: 0, profit: 0 };
  for (const row of rows) {
    if (row.type === 'reward') wallets.reward = Number(row.balance);
    if (row.type === 'deposit') wallets.deposit = Number(row.balance);
    if (row.type === 'profit') wallets.profit = Number(row.balance);
  }
  return wallets;
}

// Boolean conversion
export function bool(val: unknown): boolean {
  return Boolean(val);
}
export function intBool(val: boolean): boolean {
  return val;
}
