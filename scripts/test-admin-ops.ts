import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env
const envContent = readFileSync('/home/z/my-project/.env', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  console.log('=== Testing Admin: Activation Codes ===\n');

  // 1. Generate an activation code
  const testCode = 'TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const { data: newCode, error: insertErr } = await supabase
    .from('activation_codes')
    .insert({ code: testCode, value: 5000, status: 'unused' })
    .select()
    .single();

  if (insertErr) {
    console.log('❌ INSERT activation code FAILED:', insertErr.message);
  } else {
    console.log('✅ INSERT activation code OK:', { id: newCode.id, code: newCode.code, value: newCode.value, status: newCode.status });
  }

  // 2. Fetch activation codes
  const { data: codes, error: fetchErr } = await supabase
    .from('activation_codes')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(5);

  if (fetchErr) {
    console.log('❌ FETCH activation codes FAILED:', fetchErr.message);
  } else {
    console.log(`✅ FETCH activation codes OK: ${codes.length} returned`);
    for (const c of codes) {
      console.log(`   - ${c.code} | ₦${c.value} | ${c.status}`);
    }
  }

  // Clean up test code
  if (newCode) {
    await supabase.from('activation_codes').delete().eq('id', newCode.id);
    console.log('   (test code cleaned up)');
  }

  console.log('\n=== Testing Admin: Deposit Codes ===\n');

  // 3. Generate a deposit code
  const testDepositCode = 'DEP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const { data: newDepCode, error: depInsertErr } = await supabase
    .from('deposit_codes')
    .insert({ code: testDepositCode, amount: 10000, status: 'unused' })
    .select()
    .single();

  if (depInsertErr) {
    console.log('❌ INSERT deposit code FAILED:', depInsertErr.message);
  } else {
    console.log('✅ INSERT deposit code OK:', { id: newDepCode.id, code: newDepCode.code, amount: newDepCode.amount, status: newDepCode.status });
  }

  // 4. Fetch deposit codes
  const { data: depCodes, error: depFetchErr } = await supabase
    .from('deposit_codes')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(5);

  if (depFetchErr) {
    console.log('❌ FETCH deposit codes FAILED:', depFetchErr.message);
  } else {
    console.log(`✅ FETCH deposit codes OK: ${depCodes.length} returned`);
    for (const c of depCodes) {
      console.log(`   - ${c.code} | ₦${c.amount} | ${c.status}`);
    }
  }

  // Clean up
  if (newDepCode) {
    await supabase.from('deposit_codes').delete().eq('id', newDepCode.id);
    console.log('   (test code cleaned up)');
  }

  console.log('\n=== Testing Admin: Auth Profile ===\n');

  // 5. Check admin profile
  const { data: adminProfile, error: adminErr } = await supabase
    .from('profiles')
    .select('id, email, username, role, clerk_id, is_activated')
    .eq('role', 'admin');

  if (adminErr) {
    console.log('❌ FETCH admin profile FAILED:', adminErr.message);
  } else {
    console.log(`✅ Found ${adminProfile.length} admin(s):`);
    for (const a of adminProfile) {
      console.log(`   - ${a.email} | @${a.username} | clerk_id: ${a.clerk_id ? '✅ linked' : '❌ MISSING'} | activated: ${a.is_activated}`);
    }
  }

  console.log('\n=== Done ===');
}

main();
