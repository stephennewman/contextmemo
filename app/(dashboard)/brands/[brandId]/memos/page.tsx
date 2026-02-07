import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GenerateMemoDropdown } from '@/components/dashboard/brand-actions'
import { MemoFeed } from '@/components/dashboard/memo-feed'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'
import { BrandContext } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function MemosPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const [
    { data: brand, error },
    { data: memos },
    { data: brandSettings },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name, subdomain, context')
      .eq('id', brandId)
      .single(),
    supabase
      .from('memos')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false }),
    supabase
      .from('brand_settings')
      .select('auto_memo_enabled, daily_memo_cap, auto_respond_content, content_generation_schedule')
      .eq('brand_id', brandId)
      .single(),
  ])

  if (error || !brand) notFound()

  const context = brand.context as BrandContext
  const hubspotEnabled = !!(context?.hubspot?.enabled && context?.hubspot?.access_token && context?.hubspot?.blog_id)
  const hubspotAutoPublish = !!(context?.hubspot?.auto_publish)

  const publishedCount = (memos || []).filter((m: { status: string }) => m.status === 'published').length
  const draftCount = (memos || []).filter((m: { status: string }) => m.status === 'draft').length

  return (
    <div className="space-y-4">
      <AutomationStatusBar items={[
        { label: 'Auto Memo', enabled: brandSettings?.auto_memo_enabled ?? false },
        { label: 'Content Gen', enabled: brandSettings?.auto_respond_content ?? false, schedule: brandSettings?.content_generation_schedule ?? 'weekdays' },
        ...(brandSettings?.auto_memo_enabled ? [{ label: `Cap: ${brandSettings?.daily_memo_cap ?? 2}/day`, enabled: true }] : []),
      ]} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Memos</CardTitle>
              <CardDescription>
                {(memos || []).length} total · {publishedCount} published · {draftCount} drafts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <GenerateMemoDropdown brandId={brandId} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MemoFeed
            brandId={brandId}
            brandName={brand.name}
            brandSubdomain={brand.subdomain}
            initialMemos={(memos || []) as Array<{
              id: string
              brand_id: string
              title: string
              slug: string
              content_markdown: string
              content_html: string | null
              meta_description: string | null
              status: 'draft' | 'published'
              memo_type: string
              published_at: string | null
              created_at: string
              updated_at: string
              sources: unknown[] | null
              verified_accurate: boolean
              version: number
              schema_json: Record<string, unknown> | null
            }>}
            hubspotEnabled={hubspotEnabled}
            hubspotAutoPublish={hubspotAutoPublish}
          />
        </CardContent>
      </Card>
    </div>
  )
}
