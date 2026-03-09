import { Metadata } from 'next';
import { prisma } from '@/app/lib/db';
import ShareView from './ShareView';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCollection(id: string) {
  try {
    const collection = await prisma.collection.findFirst({
      where: { id, isPublic: true },
      include: {
        user: { select: { id: true, name: true, image: true } },
        pins: { orderBy: { createdAt: 'asc' } },
        _count: { select: { pins: true } },
      },
    });

    if (!collection) {
      // Check if it exists but is private
      const exists = await prisma.collection.findUnique({ where: { id } });
      return { collection: null, isPrivate: !!exists };
    }

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        center: { lat: collection.centerLat, lng: collection.centerLng },
        pinCount: collection._count.pins,
        creator: {
          id: collection.user.id,
          name: collection.user.name,
          image: collection.user.image,
        },
        pins: collection.pins.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          title: p.title,
          description: p.description || '',
          audioFile: p.audioUrl || '',
          photoFile: p.photoUrl || undefined,
          thumbnailFile: p.thumbnailUrl || undefined,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        })),
      },
      isPrivate: false,
    };
  } catch {
    return { collection: null, isPrivate: false };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { collection } = await getCollection(id);

  if (!collection) {
    return {
      title: 'Collection Not Found - Audio Pins',
    };
  }

  const description = `${collection.pinCount} audio ${collection.pinCount === 1 ? 'pin' : 'pins'} on a map${collection.creator?.name ? ` by ${collection.creator.name}` : ''}`;

  return {
    title: `${collection.name} - Audio Pins`,
    description,
    openGraph: {
      title: collection.name,
      description,
      url: `/share/${id}`,
      siteName: 'Audio Pins',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: collection.name,
      description,
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const { collection, isPrivate } = await getCollection(id);

  if (isPrivate) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center px-4">
        <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">This collection is private</h1>
        <p className="text-muted mb-6">The owner has not made this collection publicly available.</p>
        <a href="/" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium">Go to Audio Pins</a>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center px-4">
        <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Collection not found</h1>
        <p className="text-muted mb-6">This collection may have been removed or the link is incorrect.</p>
        <a href="/" className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium">Go to Audio Pins</a>
      </div>
    );
  }

  return <ShareView collection={collection} />;
}
