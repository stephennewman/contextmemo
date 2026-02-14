/**
 * IP-to-company enrichment via IPinfo.io
 *
 * Edge-compatible — uses Web Crypto API + raw fetch (no Node.js dependencies).
 * Cache backed by Supabase REST API (ip_enrichment_cache table).
 *
 * Free tier gives ASN org (e.g. "AS15169 Google LLC").
 * Upgrade to IPinfo Business ($249/mo) for actual company name/domain.
 */

export interface IPEnrichment {
  orgName: string | null   // e.g. "Google LLC", "Comcast Cable Communications"
  asn: string | null       // e.g. "AS15169"
  rawOrg: string | null    // Full IPinfo org field "AS15169 Google LLC"
}

// ─── Edge-compatible SHA-256 hashing ─────────────────────────────────────────

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

// ─── Parse IPinfo org field ──────────────────────────────────────────────────

function parseOrg(org: string | undefined): { orgName: string | null; asn: string | null } {
  if (!org) return { orgName: null, asn: null }
  // Format: "AS15169 Google LLC" or sometimes just "Google LLC"
  const match = org.match(/^(AS\d+)\s+(.+)$/)
  if (match) {
    return { asn: match[1], orgName: match[2] }
  }
  return { orgName: org, asn: null }
}

// ─── Cache operations (Supabase REST) ────────────────────────────────────────

async function getCachedEnrichment(ipHash: string): Promise<IPEnrichment | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ip_enrichment_cache?ip_hash=eq.${ipHash}&select=org_name,asn,raw_org`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (rows.length === 0) return null
    return {
      orgName: rows[0].org_name,
      asn: rows[0].asn,
      rawOrg: rows[0].raw_org,
    }
  } catch {
    return null
  }
}

async function setCachedEnrichment(ipHash: string, enrichment: IPEnrichment): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  try {
    await fetch(`${supabaseUrl}/rest/v1/ip_enrichment_cache`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        ip_hash: ipHash,
        org_name: enrichment.orgName,
        asn: enrichment.asn,
        raw_org: enrichment.rawOrg,
      }),
    })
  } catch {
    // Fail silently — caching is best-effort
  }
}

// ─── IPinfo API call ─────────────────────────────────────────────────────────

async function callIPinfo(ip: string): Promise<IPEnrichment> {
  const token = process.env.IPINFO_TOKEN
  const url = token
    ? `https://ipinfo.io/${ip}/json?token=${token}`
    : `https://ipinfo.io/${ip}/json`

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000), // 3s timeout — don't block on slow API
    })

    if (!res.ok) {
      return { orgName: null, asn: null, rawOrg: null }
    }

    const data = await res.json()
    const { orgName, asn } = parseOrg(data.org)

    return {
      orgName,
      asn,
      rawOrg: data.org || null,
    }
  } catch {
    // Timeout or network error — fail silently
    return { orgName: null, asn: null, rawOrg: null }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enrich an IP address with organization/company data.
 * Edge-compatible. Checks Supabase cache first, falls back to IPinfo API.
 * Returns null only if IP is missing/invalid — otherwise returns enrichment
 * (which may have null fields if IPinfo returned nothing).
 */
export async function enrichIP(rawIp: string | null): Promise<IPEnrichment | null> {
  if (!rawIp || rawIp === 'unknown') return null

  // Take first IP from x-forwarded-for chain, strip whitespace
  const ip = rawIp.split(',')[0].trim()
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null

  const ipHash = await hashIp(ip)

  // 1. Check cache
  const cached = await getCachedEnrichment(ipHash)
  if (cached) return cached

  // 2. Call IPinfo
  const enrichment = await callIPinfo(ip)

  // 3. Cache the result (even empty — avoids re-calling for IPs with no data)
  await setCachedEnrichment(ipHash, enrichment)

  return enrichment
}

// ─── Org Classification ──────────────────────────────────────────────────────

export type OrgType = 'business' | 'isp' | 'datacenter' | 'unknown'

// Known cloud/hosting/datacenter providers
const DATACENTER_PATTERNS = [
  /amazon\.com/i, /amazon web services/i, /aws/i,
  /microsoft/i, /azure/i,
  /google cloud/i, /google llc/i,
  /digitalocean/i, /linode/i, /vultr/i, /hetzner/i, /ovh/i,
  /cloudflare/i, /akamai/i, /fastly/i, /oracle cloud/i,
  /rackspace/i, /scaleway/i, /equinix/i,
  /alibaba/i, /tencent cloud/i,
  /heroku/i, /render/i, /fly\.io/i, /vercel/i, /netlify/i,
  /leaseweb/i, /softlayer/i, /choopa/i, /colocrossing/i,
  /quadranet/i, /psychz/i, /servercentral/i,
]

// Known ISP/residential providers (US + major international)
const ISP_PATTERNS = [
  /comcast/i, /xfinity/i, /charter/i, /spectrum/i,
  /verizon/i, /at&t/i, /att /i, /at&t/i, /bellsouth/i,
  /t-mobile/i, /sprint/i, /cox /i, /cox comm/i,
  /centurylink/i, /lumen/i, /frontier/i, /windstream/i,
  /mediacom/i, /altice/i, /optimum/i, /cablevision/i,
  /earthlink/i, /hughesnet/i, /starlink/i,
  /british telecom/i, /bt /i, /vodafone/i, /orange/i,
  /deutsche telekom/i, /telefonica/i, /telia/i, /swisscom/i,
  /telstra/i, /ntt /i, /kddi/i, /softbank/i,
  /rogers/i, /bell canada/i, /telus/i, /shaw/i,
  /sky broadband/i, /virgin media/i, /talktalk/i,
]

/** Classify an org name as business, ISP, datacenter, or unknown */
export function classifyOrg(orgName: string | null): OrgType {
  if (!orgName) return 'unknown'
  if (DATACENTER_PATTERNS.some(p => p.test(orgName))) return 'datacenter'
  if (ISP_PATTERNS.some(p => p.test(orgName))) return 'isp'
  // If it has a name and isn't a known ISP/datacenter, it's likely a business
  return 'business'
}

/** Check if an org name looks like a datacenter/hosting provider */
export function isDatacenterOrg(orgName: string | null): boolean {
  return classifyOrg(orgName) === 'datacenter'
}

/** Check if an org is a real business (not ISP or datacenter) */
export function isBusinessOrg(orgName: string | null): boolean {
  return classifyOrg(orgName) === 'business'
}
