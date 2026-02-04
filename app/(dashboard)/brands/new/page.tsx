'use client'

import { useState } from 'react'
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

  // Check domain verification when domain changes
  const checkVerification = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.email) {
      setUserEmail(user.email)
      const verified = verifyDomainOwnership(user.email, domain)
      setIsVerified(verified)
    }
  }

  // Generate subdomain from brand name
  const handleBrandNameChange = (name: string) => {
    setBrandName(name)
    const generated = generateSubdomain(name)
    setSubdomain(generated)
  }

  // Handle domain change
  const handleDomainChange = (value: string) => {
    // Clean up the domain
    let cleanDomain = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    setDomain(cleanDomain)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    // Validate subdomain
    if (!isValidSubdomain(subdomain)) {
      setError('Invalid subdomain. Use 3-63 lowercase letters, numbers, and hyphens.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to continue')
        setLoading(false)
        return
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
          setError('Failed to create account')
          setLoading(false)
          return
        }
      }

      // Check if subdomain is taken
      const { data: existing } = await supabase
        .from('brands')
        .select('id')
        .eq('subdomain', subdomain)
        .single()

      if (existing) {
        setError('This subdomain is already taken. Please choose another.')
        setLoading(false)
        return
      }

      // Create brand
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .insert({
          tenant_id: tenant?.id || user.id,
          name: brandName,
          domain: domain,
          subdomain: subdomain,
          verified: isVerified,
          verification_method: isVerified ? 'email_domain' : null,
          verified_at: isVerified ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (brandError) {
        console.error('Brand creation error:', brandError)
        console.error('Error details:', {
          code: brandError.code,
          message: brandError.message,
          details: brandError.details,
          hint: brandError.hint,
          user_id: user.id,
          tenant_id: tenant?.id || user.id,
          brand_name: brandName,
          subdomain: subdomain
        })
        setError(`Failed to create brand: ${brandError.message}`)
        setLoading(false)
        return
      }

      toast.success('Brand created successfully!')
      
      // Redirect to brand page to continue setup
      router.push(`/brands/${brand.id}`)
      router.refresh()
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
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
              <Label htmlFor="brandName">Brand name</Label>
              <Input
                id="brandName"
                placeholder="e.g., Checkit"
                value={brandName}
                onChange={(e) => handleBrandNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Website domain</Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">https://</span>
                <Input
                  id="domain"
                  placeholder="checkit.net"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  onBlur={checkVerification}
                />
              </div>
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
                  <Badge className="bg-green-500">
                    <Check className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline">
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
              <Label htmlFor="subdomain">Your Context Memo URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  className="flex-1"
                />
                <span className="text-muted-foreground">.contextmemo.com</span>
              </div>
              {subdomain && !isValidSubdomain(subdomain) && (
                <p className="text-sm text-destructive">
                  Invalid subdomain. Use 3-63 lowercase letters, numbers, and hyphens.
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
