'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  verifyDomainOwnership, 
  generateSubdomain, 
  isValidSubdomain,
  getEmailDomain
} from '@/lib/utils/domain-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, ArrowRight, Globe, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function NewBrandPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [brandName, setBrandName] = useState('')
  const [domain, setDomain] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [verifying, setVerifying] = useState(false)

  const googleSearchConsoleSiteUrl = domain ? `sc-domain:${domain}` : ''
  const bingWebmasterSiteUrl = domain ? `https://${domain}` : ''

  // Sanitize input to prevent XSS and other attacks
  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/[<>"']/g, '') // Remove potential script injection characters
      .substring(0, 255) // Limit length
  }

  // Check domain verification when domain changes
  const checkVerification = useCallback(async () => {
    if (!domain || domain.length < 4) {
      setIsVerified(false)
      return
    }

    setVerifying(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('[Auth Error]', authError)
        setError('Authentication error. Please sign in again.')
        return
      }
      
      if (user?.email) {
        setUserEmail(user.email)
        const verified = verifyDomainOwnership(user.email, domain)
        setIsVerified(verified)
      }
    } catch (err) {
      console.error('[Domain Verification Error]', err)
      setError('Failed to verify domain. Please try again.')
    } finally {
      setVerifying(false)
    }
  }, [domain])

  // Debounce domain verification
  useEffect(() => {
    const timer = setTimeout(() => {
      if (domain) {
        checkVerification()
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [domain, checkVerification])

  // Generate subdomain from brand name
  const handleBrandNameChange = (name: string) => {
    const sanitizedName = sanitizeInput(name)
    setBrandName(sanitizedName)
    const generated = generateSubdomain(sanitizedName)
    setSubdomain(generated)
    setError(null) // Clear errors when user types
  }

  // Handle domain change
  const handleDomainChange = (value: string) => {
    // Clean up and sanitize the domain
    const cleanDomain = value
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim()
    
    // Validate domain format
    const domainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]?(\.[a-z0-9][a-z0-9-]*[a-z0-9]?)*\.[a-z]{2,}$/i
    if (!domainRegex.test(cleanDomain)) {
      setError('Please enter a valid domain (e.g., example.com)')
    } else {
      setError(null)
    }
    
    setDomain(cleanDomain)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      // Comprehensive validation
      if (!brandName || brandName.length < 2) {
        throw new Error('Brand name must be at least 2 characters long')
      }

      if (!domain || domain.length < 4) {
        throw new Error('Please enter a valid domain')
      }

      if (!isValidSubdomain(subdomain)) {
        throw new Error('Invalid subdomain. Use 3-63 lowercase letters, numbers, and hyphens (cannot start or end with hyphen)')
      }

      // Sanitize all inputs before submission
      const sanitizedBrandName = sanitizeInput(brandName)
      const sanitizedDomain = domain.toLowerCase().trim()
      const sanitizedSubdomain = subdomain.toLowerCase().trim()

      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('[Auth Error] Failed to get user:', authError)
        throw new Error('Authentication error. Please sign in again.')
      }
      
      if (!user) {
        throw new Error('Please sign in to continue')
      }

      // Get or create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', user.id)
        .single()

      if (tenantError || !tenant) {
        // Create tenant if it doesn't exist
        const { error: createError } = await supabase
          .from('tenants')
          .insert({
            id: user.id,
            email: user.email!,
            email_domain: getEmailDomain(user.email!),
            name: user.user_metadata?.name || null,
          })

        if (createError && !createError.message.includes('duplicate')) {
          console.error('[Tenant Creation Error]', {
            code: createError.code,
            message: createError.message,
            userId: user.id,
            timestamp: new Date().toISOString()
          })
          throw new Error('Failed to create account. Please contact support if this persists.')
        }
      }

      // Check if subdomain is taken
      const { data: existing, error: checkError } = await supabase
        .from('brands')
        .select('id')
        .eq('subdomain', sanitizedSubdomain)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Subdomain Check Error]', checkError)
        throw new Error('Failed to verify subdomain availability. Please try again.')
      }

      if (existing) {
        throw new Error('This subdomain is already taken. Please choose another.')
      }

      // Create brand with sanitized inputs
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .insert({
          tenant_id: tenant?.id || user.id,
          name: sanitizedBrandName,
          domain: sanitizedDomain,
          subdomain: sanitizedSubdomain,
          context: {
            search_console: {
              bing: {
                enabled: false,
                site_url: `https://${sanitizedDomain}`,
              },
              google: {
                enabled: false,
                site_url: `sc-domain:${sanitizedDomain}`,
              },
            },
          },
          verified: isVerified,
          verification_method: isVerified ? 'email_domain' : null,
          verified_at: isVerified ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (brandError) {
        console.error('[Brand Creation Error]', {
          code: brandError.code,
          message: brandError.message,
          details: brandError.details,
          hint: brandError.hint,
          userId: user.id,
          tenantId: tenant?.id || user.id,
          brandName: sanitizedBrandName,
          subdomain: sanitizedSubdomain,
          timestamp: new Date().toISOString()
        })
        
        // Provide user-friendly error messages
        if (brandError.code === '23505') {
          throw new Error('A brand with this subdomain already exists. Please choose a different subdomain.')
        } else if (brandError.code === '23503') {
          throw new Error('Account setup incomplete. Please refresh the page and try again.')
        } else {
          throw new Error(`Failed to create brand. Please try again or contact support if the issue persists.`)
        }
      }

      toast.success('Brand created successfully!')
      
      // Redirect to brand page to continue setup
      router.push(`/brands/${brand.id}`)
      router.refresh()
    } catch (err) {
      console.error('[Unexpected Error]', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      })
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add your brand</h1>
        <p className="text-muted-foreground mt-2">
          Set up your brand to start creating Context Memos that AI can cite.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          1
        </div>
        <div className={`h-1 flex-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          2
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brand Details
            </CardTitle>
            <CardDescription>
              Enter your brand name and website domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand name *</Label>
              <Input
                id="brandName"
                data-testid="brand-name-input"
                placeholder="e.g., Checkit"
                value={brandName}
                onChange={(e) => handleBrandNameChange(e.target.value)}
                maxLength={255}
                required
              />
              {brandName && brandName.length < 2 && (
                <p className="text-sm text-muted-foreground">Brand name must be at least 2 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Website domain *</Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">https://</span>
                <Input
                  id="domain"
                  data-testid="domain-input"
                  placeholder="checkit.net"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  required
                />
              </div>
              {verifying && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verifying domain...
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => setStep(2)} 
              disabled={!brandName || !domain}
              className="w-full"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Verify & Create
            </CardTitle>
            <CardDescription>
              Review your brand details and create your Context Memo subdomain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Domain verification status */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Domain Verification</span>
                {isVerified ? (
                  <Badge className="bg-green-500" data-testid="verification-badge">
                    <Check className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" data-testid="verification-badge">
                    <X className="mr-1 h-3 w-3" /> Not Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isVerified ? (
                  <>Your email domain matches <strong>{domain}</strong></>
                ) : (
                  <>Your email ({userEmail}) doesn&apos;t match {domain}. You can still create the brand, but some features may be limited.</>
                )}
              </p>
            </div>

            {/* Subdomain */}
            <div className="space-y-2">
              <Label htmlFor="subdomain">Your Context Memo URL *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  data-testid="subdomain-input"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value.toLowerCase())
                    setError(null)
                  }}
                  className="flex-1"
                  maxLength={63}
                  required
                />
                <span className="text-muted-foreground whitespace-nowrap">.contextmemo.com</span>
              </div>
              {subdomain && !isValidSubdomain(subdomain) && (
                <p className="text-sm text-destructive">
                  Invalid subdomain. Use 3-63 lowercase letters, numbers, and hyphens (cannot start or end with hyphen).
                </p>
              )}
              {subdomain && isValidSubdomain(subdomain) && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Subdomain format is valid
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Summary</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Brand:</dt>
                  <dd className="font-medium">{brandName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Website:</dt>
                  <dd className="font-medium">{domain}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Memo URL:</dt>
                  <dd className="font-medium">{subdomain}.contextmemo.com</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-muted-foreground">Crawl tracking (brand site):</dt>
                  <dd className="font-medium">Google: {googleSearchConsoleSiteUrl || '—'}</dd>
                  <dd className="font-medium">Bing: {bingWebmasterSiteUrl || '—'}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !isValidSubdomain(subdomain)}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Brand
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
