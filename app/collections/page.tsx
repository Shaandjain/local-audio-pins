'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const spring = { type: 'spring' as const, stiffness: 350, damping: 25 };

const containerVariants = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  show: {
    opacity: 1,
    transition: prefersReducedMotion ? {} : { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
  show: { opacity: 1, y: 0, transition: spring },
};

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  center: { lat: number; lng: number };
  pinCount: number;
  lastPinDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CollectionCard({ collection }: { collection: Collection }) {
  const hue = collection.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const bgColor = `hsl(${hue}, 8%, 92%)`;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
      transition={spring}
    >
      <Link
        href={`/c/${collection.id}`}
        className="group block card hover:border-border-strong transition-colors duration-200"
      >
        <div
          className="h-36 rounded-t-xl flex items-center justify-center"
          style={{ background: bgColor }}
        >
          <svg className="w-10 h-10 text-muted-light opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-base group-hover:text-accent-hover transition-colors truncate">
              {collection.name}
            </h3>
            <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              collection.isPublic
                ? 'border-border bg-surface-hover text-muted'
                : 'border-border bg-surface text-muted-light'
            }`}>
              {collection.isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          {collection.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{collection.description}</p>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-muted-light">
            <span>{collection.pinCount} {collection.pinCount === 1 ? 'pin' : 'pins'}</span>
            <span>{formatDate(collection.createdAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/collections');
        if (res.status === 401) {
          router.push('/auth/signin');
          return;
        }
        if (!res.ok) throw new Error('Failed to load collections');
        const data = await res.json();
        setCollections(data.collections);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-muted">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading collections...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary rounded-full">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="max-w-5xl mx-auto px-6 py-8"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/" className="text-muted hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-semibold text-foreground">My Collections</h1>
            </div>
            <p className="text-sm text-muted ml-8">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </p>
          </div>
          <Link
            href="/collections/new"
            className="btn-primary rounded-full flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Collection</span>
          </Link>
        </div>

        {/* Collections Grid */}
        <AnimatePresence mode="wait">
          {collections.length === 0 ? (
            <motion.div
              key="empty"
              className="flex flex-col items-center justify-center py-24 text-center"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
            >
              <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No collections yet</h2>
              <p className="text-sm text-muted mb-6 max-w-sm">
                Create your first collection to start organizing your audio pins by location or theme.
              </p>
              <Link href="/collections/new" className="btn-primary rounded-full">
                Create your first collection
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}

              {/* Add new collection card */}
              <motion.div variants={itemVariants}>
                <Link
                  href="/collections/new"
                  className="flex flex-col items-center justify-center min-h-[220px] rounded-xl border-2 border-dashed border-border hover:border-border-strong hover:bg-surface-hover transition-all duration-200 text-muted hover:text-foreground"
                >
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-sm font-medium">New Collection</span>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
