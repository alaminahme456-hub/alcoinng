import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl

  // Skip middleware for auth routes — they handle their own auth
  if (url.pathname.startsWith('/api/auth/')) {
    return NextResponse.next({ request })
  }

  // Only run session refresh for authenticated API routes
  try {
    const { createServerClient } = await import('@supabase/ssr')

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh the session
    await supabase.auth.getUser()

    return supabaseResponse
  } catch {
    // If Supabase client fails, let the request pass through
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}