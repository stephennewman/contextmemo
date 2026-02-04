import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function V2MemosPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get brand
  const { data: brand, error } = await serviceClient
    .from('brands')
    .select('id, name, subdomain')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Get memos for this brand
  const { data: memos } = await serviceClient
    .from('memos')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/v2/brands/${brandId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold text-[#0F172A]">Memos</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {memos?.length || 0} memos for {brand.name}
            </p>
          </div>
          
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Create Memo
          </Button>
        </div>
      </div>
      
      {/* Memos List */}
      <div className="flex-1 overflow-auto p-6">
        {!memos || memos.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No memos yet</h3>
            <p className="text-muted-foreground mb-4">
              Memos are AI-optimized content that helps you get cited
            </p>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
              <Plus className="h-4 w-4 mr-2" />
              Generate Memo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {memos.map(memo => {
              const verification = (memo.schema_json as { verification?: { verified?: boolean } })?.verification
              const isVerified = verification?.verified
              
              return (
                <div 
                  key={memo.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#0F172A] truncate">
                          {memo.title}
                        </h3>
                        {memo.status === 'published' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {memo.meta_description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}
                        </span>
                        
                        {memo.memo_type && (
                          <Badge variant="outline" className="text-xs">
                            {memo.memo_type}
                          </Badge>
                        )}
                        
                        {isVerified && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {memo.status === 'published' && brand.subdomain && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://${brand.subdomain}.contextmemo.com/${memo.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/brands/${brandId}/memos/${memo.id}`}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
