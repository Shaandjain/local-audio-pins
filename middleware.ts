import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Protect the main app route
    '/app/:path*',
    // Protect collection pages
    '/collections/:path*',
    '/c/:path*',
    // Protect API routes except auth, public endpoints, and static files
    '/api/collections/:path*',
    '/api/tours/:path*',
    '/api/preferences/:path*',
    '/api/areas/:path*',
    // Note: /, /auth/*, /share/*, /u/*, /explore, /api/public/*, /api/audio/*, /api/photos/* are NOT protected
  ],
};
