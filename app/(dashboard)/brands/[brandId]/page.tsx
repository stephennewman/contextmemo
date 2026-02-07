import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function BrandPage({ params }: Props) {
  const { brandId } = await params
  redirect(`/brands/${brandId}/prompts`)
}
