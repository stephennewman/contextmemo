import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sanitizeName, sanitizeErrorMessage, requireServiceRoleKey } from '@/lib/security/validation'

// Service role client for updating user profile - will throw in production if not configured
const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  requireServiceRoleKey()
)

// Create authenticated client to get current user
async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const supabase = await getAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from tenants table
    const supabaseAdmin = getSupabaseAdmin()
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, email, plan, created_at')
      .eq('id', user.id)
      .single()

    if (tenantError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      plan: tenant.plan,
      created_at: tenant.created_at,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile (name)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    // Validate and sanitize name input
    const sanitizedName = sanitizeName(name, 100)
    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters and contain only valid characters' },
        { status: 400 }
      )
    }

    // Update tenant profile
    const supabaseAdmin = getSupabaseAdmin()
    const { data: tenant, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ name: sanitizedName })
      .eq('id', user.id)
      .select('id, name, email')
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
      },
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}
