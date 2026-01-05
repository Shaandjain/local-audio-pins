import { Suspense } from 'react';
import MapView from './components/Map';

function MapLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex items-center gap-3 text-muted">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading map...</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<MapLoading />}>
      <MapView />
    </Suspense>
  );
}
