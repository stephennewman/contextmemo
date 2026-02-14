import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResearchView } from '@/components/dashboard/research-view'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function ResearchPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: brand, error } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  return <ResearchView brandId={brandId} brandName={brand.name} />
}
