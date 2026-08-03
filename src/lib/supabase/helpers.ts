import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Convert a snake_case profile row to the app's camelCase UserData format
export function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email || '',
    phone: row.phone,
    role: row.role,
    isActivated: row.is_activated,
    activatedAt: row.activated_at,
    referralCode: row.referral_code,
    profilePicture: row.profile_picture,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    bankAccountName: row.bank_account_name,
    createdAt: row.created_at,
  };
}

// Get the authenticated Supabase user + their profile (bypasses RLS for profile read)
// Returns null if not authenticated
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { user, profile, email: user.email! };
}

// Check if the authenticated user is an admin
export async function getAuthAdmin() {
  const auth = await getAuthUser();
  if (!auth || auth.profile.role !== 'admin') return null;
  return auth;
}
