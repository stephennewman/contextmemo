import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  ArrowLeft,
  Plus,
  FileText,
  Eye,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface Props {
  params: Promise<{ brandId: string }>
}

// Format memo type for display
function formatMemoType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
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
    .select('id, name, subdomain, custom_domain, domain_verified')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Get memos for this brand with analytics
  const { data: memos } = await serviceClient
    .from('memos')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  // Count by status
  const publishedCount = memos?.filter(m => m.status === 'published').length || 0
  const draftCount = memos?.filter(m => m.status === 'draft').length || 0

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
              {memos?.length || 0} total &middot; {publishedCount} published &middot; {draftCount} drafts
            </p>
          </div>
          
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Create Memo
          </Button>
        </div>
      </div>
      
      {/* Memos Table */}
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
          <div className="bg-white border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memos.map(memo => {
                  const contentLength = memo.content_markdown?.length || 0
                  
                  return (
                    <TableRow key={memo.id} className="group">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Link 
                            href={`/brands/${brandId}/memos/${memo.id}`}
                            className="font-medium text-[#0F172A] hover:text-[#0EA5E9] truncate max-w-md"
                          >
                            {memo.title}
                          </Link>
                          <span className="text-xs text-muted-foreground truncate max-w-md">
                            /{memo.slug}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {formatMemoType(memo.memo_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {memo.status === 'published' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-normal">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span title={format(new Date(memo.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span title={format(new Date(memo.updated_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(memo.updated_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {memo.status === 'published' && brand.subdomain && (
                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                              <a 
                                href={brand.custom_domain && brand.domain_verified ? `https://${brand.custom_domain}/${memo.slug}` : `https://${brand.subdomain}.contextmemo.com/${memo.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View live memo"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <Link href={`/brands/${brandId}/memos/${memo.id}`} title="Edit memo">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
