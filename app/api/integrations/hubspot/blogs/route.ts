import { NextRequest, NextResponse } from 'next/server'

interface HubSpotBlog {
  id: string
  name: string
  publicTitle: string
  slug: string
  absoluteUrl: string
}

interface HubSpotBlogsResponse {
  results: HubSpotBlog[]
  paging?: {
    next?: {
      after: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Fetch blogs from HubSpot
    const response = await fetch(
      'https://api.hubapi.com/cms/v3/blogs/posts?limit=1',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // First, let's try to get blogs via the blog-settings endpoint
    const blogsResponse = await fetch(
      'https://api.hubapi.com/cms/v3/blog-settings/settings?limit=50',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!blogsResponse.ok) {
      const errorData = await blogsResponse.json().catch(() => ({}))
      
      if (blogsResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid access token. Please check your HubSpot Private App token.' },
          { status: 401 }
        )
      }
      if (blogsResponse.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Make sure your Private App has "CMS Blog" read permissions.' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch blogs from HubSpot' },
        { status: blogsResponse.status }
      )
    }

    const data: HubSpotBlogsResponse = await blogsResponse.json()

    // Map to simplified format
    const blogs = data.results.map((blog) => ({
      id: blog.id,
      name: blog.name || blog.publicTitle || 'Untitled Blog',
      slug: blog.slug,
      url: blog.absoluteUrl,
    }))

    return NextResponse.json({
      success: true,
      blogs,
      message: blogs.length > 0 
        ? `Found ${blogs.length} blog(s)` 
        : 'No blogs found. Create a blog in HubSpot first.',
    })
  } catch (error) {
    console.error('HubSpot blogs fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to HubSpot' },
      { status: 500 }
    )
  }
}
