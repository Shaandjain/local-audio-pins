import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Protect API routes except auth, public endpoints, and static files
    '/api/collections/:path*',
    '/api/tours/:path*',
    '/api/preferences/:path*',
    '/api/areas/:path*',
    // Note: /api/public/*, /api/audio/*, /api/photos/*, /share/*, /u/* are NOT protected
  ],
};
