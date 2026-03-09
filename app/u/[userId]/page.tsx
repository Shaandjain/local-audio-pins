import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/app/lib/db';

interface PageProps {
  params: Promise<{ userId: string }>;
}

async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        collections: {
          where: { isPublic: true },
          include: {
            _count: { select: { pins: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    return user;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUserProfile(userId);

  if (!user) {
    return { title: 'User Not Found - Audio Pins' };
  }

  const name = user.name || 'User';
  const collectionCount = user.collections.length;

  return {
    title: `${name} - Audio Pins`,
    description: `${collectionCount} public ${collectionCount === 1 ? 'collection' : 'collections'} on Audio Pins`,
    openGraph: {
      title: `${name} on Audio Pins`,
      description: `${collectionCount} public ${collectionCount === 1 ? 'collection' : 'collections'}`,
      type: 'profile',
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const user = await getUserProfile(userId);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center px-4">
        <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">User not found</h1>
        <p className="text-muted mb-6">This profile doesn&apos;t exist or has been removed.</p>
        <a href="/" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium">Go to Audio Pins</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ overflow: 'auto', height: '100vh' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Profile header */}
        <div className="flex flex-col items-center mb-10">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="w-20 h-20 rounded-full border-2 border-border mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {user.name || 'Anonymous'}
          </h1>
          <p className="text-sm text-muted mt-1">
            {user.collections.length} public {user.collections.length === 1 ? 'collection' : 'collections'}
          </p>
        </div>

        {/* Collections list */}
        {user.collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">No public collections yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {user.collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/share/${collection.id}`}
                className="card hover:shadow-md transition-all duration-200 p-5 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-hover border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-border transition-colors">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-base group-hover:text-accent-hover transition-colors truncate">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-muted mt-0.5">
                    {collection._count.pins} {collection._count.pins === 1 ? 'pin' : 'pins'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-muted-light group-hover:text-muted transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a href="/" className="text-sm text-muted hover:text-foreground transition-colors">
            Audio Pins
          </a>
        </div>
      </div>
    </div>
  );
}
