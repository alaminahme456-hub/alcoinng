import { readFileSync } from 'fs';

// Load .env manually
const envContent = readFileSync('.env', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // Check all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, username, role, clerk_id, is_activated')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${profiles?.length || 0} profile(s):\n`);
  for (const p of profiles || []) {
    console.log(`  Email: ${p.email}`);
    console.log(`  Username: ${p.username}`);
    console.log(`  Role: ${p.role}`);
    console.log(`  Clerk ID: ${p.clerk_id || '(empty - NOT LINKED TO CLERK)'} `);
    console.log(`  Activated: ${p.is_activated}`);
    console.log('---');
  }

  // Check if clerk_id column exists
  const { data: test } = await supabase
    .from('profiles')
    .select('clerk_id')
    .limit(1);
  console.log(`\nclerk_id column exists: ${test !== null}`);
}

main();
