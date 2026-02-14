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

// ─── Known datacenter/hosting org patterns ───────────────────────────────────

const DATACENTER_PATTERNS = [
  /amazon/i, /aws/i, /microsoft/i, /azure/i, /google cloud/i,
  /digitalocean/i, /linode/i, /vultr/i, /hetzner/i, /ovh/i,
  /cloudflare/i, /akamai/i, /fastly/i, /oracle cloud/i,
  /rackspace/i, /scaleway/i, /equinix/i,
]

/** Check if an org name looks like a datacenter/hosting provider */
export function isDatacenterOrg(orgName: string | null): boolean {
  if (!orgName) return false
  return DATACENTER_PATTERNS.some(p => p.test(orgName))
}
