import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityTab } from '@/components/dashboard/activity-feed'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function ActivityPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: brand, error } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  return <ActivityTab brandId={brandId} brandName={brand.name} />
}
