// Run with: npx tsx scripts/create-test-user.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  console.log('\nTo get this key:')
  console.log('1. Go to https://supabase.com/dashboard/project/ncrclfpiremxmqpvmavx/settings/api')
  console.log('2. Copy the "service_role" key (not anon)')
  console.log('3. Add it to .env.local as SUPABASE_SERVICE_ROLE_KEY=your_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  const email = 'test@contextmemo.com'
  const password = 'testpassword123'

  console.log('Creating test user...')

  // Create user via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('User already exists!')
      console.log(`\nLogin with:\n  Email: ${email}\n  Password: ${password}`)
      return
    }
    console.error('Auth error:', authError)
    return
  }

  console.log('Auth user created:', authData.user?.id)

  // Create tenant record
  const { error: tenantError } = await supabase
    .from('tenants')
    .insert({
      id: authData.user!.id,
      email,
      email_domain: 'contextmemo.com',
      name: 'Test User',
    })

  if (tenantError) {
    console.error('Tenant error:', tenantError)
  } else {
    console.log('Tenant record created')
  }

  console.log('\n✅ Test user created!')
  console.log(`\nLogin with:\n  Email: ${email}\n  Password: ${password}`)
}

createTestUser()
