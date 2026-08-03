import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './AuthContext';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Was shipping to every real visitor's production bundle unconditionally --
// it's in dependencies, not devDependencies, and the previous static `import`
// meant a production build always included it regardless. A dynamic import
// inside a dev-only branch puts it in its own chunk that a production build
// never even requests, rather than relying on dead-code elimination to
// reliably strip a statically-imported module.
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
