const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

function getHeaders() {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not configured')
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function getProjectId() {
  if (!VERCEL_PROJECT_ID) throw new Error('VERCEL_PROJECT_ID is not configured')
  return VERCEL_PROJECT_ID
}

export interface VercelDomainResponse {
  name: string
  verified: boolean
  error?: { code: string; message: string }
}

export interface VercelDomainConfig {
  misconfigured: boolean
  cnames?: string[]
}

/**
 * Add a custom domain to the Vercel project.
 * The customer must then add a CNAME record pointing to cname.vercel-dns.com.
 */
export async function addCustomDomain(domain: string): Promise<VercelDomainResponse> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${getProjectId()}/domains`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name: domain }),
    }
  )
  return res.json()
}

/**
 * Remove a custom domain from the Vercel project.
 */
export async function removeCustomDomain(domain: string): Promise<{ success: boolean }> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${getProjectId()}/domains/${domain}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  )
  if (res.status === 200 || res.status === 204) return { success: true }
  return { success: false }
}

/**
 * Verify DNS configuration for a custom domain.
 * Returns whether the domain is properly configured (CNAME pointing to Vercel).
 */
export async function verifyCustomDomain(domain: string): Promise<{
  verified: boolean
  misconfigured: boolean
}> {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${getProjectId()}/domains/${domain}/verify`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  )
  const data = await res.json()
  return {
    verified: data.verified === true,
    misconfigured: data.misconfigured === true,
  }
}

/**
 * Get the configuration/status of a domain on the Vercel project.
 */
export async function getDomainConfig(domain: string): Promise<VercelDomainConfig> {
  const res = await fetch(
    `https://api.vercel.com/v6/domains/${domain}/config`,
    { headers: getHeaders() }
  )
  return res.json()
}
