const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://coywatzyqdnxahavxryz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdhdHp5cWRueGFoYXZ4cnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg2NTgxMSwiZXhwIjoyMTAxNDQxODExfQ.Pk457hrKdeHzBfCtnTfthn2Ir6FzHedSF3HU2chRong'
);

async function makeAdmin() {
  // Find user by email in auth.users
  const { data, error } = await supabase.auth.admin.listUsers({
    filters: { email: 'alaminahme456@gmail.com' },
    perPage: 1,
  });

  if (error || !data.users.length) {
    console.error('User not found:', error?.message);
    return;
  }

  const userId = data.users[0].id;
  console.log('Found user:', userId);

  // Update profile role to admin
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (updateError) {
    console.error('Update failed:', updateError.message);
  } else {
    console.log('Done! alaminahme456@gmail.com is now an admin.');
  }
}

makeAdmin();
