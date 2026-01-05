import CollectionView from './CollectionView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  return <CollectionView collectionId={id} />;
}
