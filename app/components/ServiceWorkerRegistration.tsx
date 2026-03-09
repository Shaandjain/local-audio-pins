'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // When a new service worker is available, tell it to activate
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - activate it
                newWorker.postMessage('skipWaiting');
              }
            };
          };
        })
        .catch((err) => {
          console.error('SW registration failed:', err);
        });
    }
  }, []);

  return null;
}
