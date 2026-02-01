import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/brands/new'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Email verified successfully - now create tenant record
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if tenant already exists (in case of re-verification)
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (!existingTenant) {
          // Create tenant record using user metadata from signup
          const { error: tenantError } = await supabase
            .from('tenants')
            .insert({
              id: user.id,
              email: user.email!,
              email_domain: user.user_metadata?.email_domain || user.email!.split('@')[1],
              name: user.user_metadata?.name || null,
            })
          
          if (tenantError) {
            console.error('Tenant creation error:', tenantError.message, tenantError.code, tenantError.details)
          }
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If no code or error, redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
