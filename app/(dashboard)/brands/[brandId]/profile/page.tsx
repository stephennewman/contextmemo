import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSection } from '@/components/dashboard/profile-section'
import { BrandContext } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: brand, error } = await supabase
    .from('brands')
    .select('name, domain, context, context_extracted_at')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  const context = brand.context as BrandContext
  const hasContext = context && Object.keys(context).length > 0

  return (
    <ProfileSection
      brandId={brandId}
      brandName={brand.name}
      brandDomain={brand.domain}
      context={context}
      contextExtractedAt={brand.context_extracted_at}
      hasContext={hasContext}
    />
  )
}
