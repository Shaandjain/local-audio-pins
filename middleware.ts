import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Protect API routes except auth, public collection views, and static files
    '/api/collections/:path*',
    '/api/tours/:path*',
    '/api/preferences/:path*',
    '/api/areas/:path*',
  ],
};
