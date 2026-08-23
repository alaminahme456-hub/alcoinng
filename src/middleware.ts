import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip middleware for auth routes — they handle their own auth
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next({ request })
  }
  // All other API routes pass through — auth is checked per-route
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}