import { Metadata } from 'next';
import { prisma } from '@/app/lib/db';
import ProfileContent from './ProfileContent';

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
        <a href="/app" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium">Go to Audio Pins</a>
      </div>
    );
  }

  return <ProfileContent user={user} />;
}
