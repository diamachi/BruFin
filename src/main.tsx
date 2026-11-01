import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeLocalDatabase } from './utils/storage';

// Immediately initialize safe area insets for Android/mobile devices
if (typeof window !== 'undefined') {
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    const rootStyle = document.documentElement.style;
    if (!rootStyle.getPropertyValue('--safe-area-inset-top')) {
      rootStyle.setProperty('--safe-area-inset-top', '44px');
      rootStyle.setProperty('--android-status-bar-height', '44px');
    }
    if (!rootStyle.getPropertyValue('--safe-area-inset-bottom')) {
      rootStyle.setProperty('--safe-area-inset-bottom', '24px');
      rootStyle.setProperty('--android-nav-bar-height', '24px');
    }
  }
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const renderStartupMessage = (message: string, canRetry: boolean) => root.render(
  <main className="min-h-screen bg-[#F7F6F3] dark:bg-[#17191C] text-slate-800 dark:text-[#F2F3F5] flex items-center justify-center p-6 font-sans">
    <section className="max-w-md rounded-3xl border border-[#E8E1DB] dark:border-[#363B44] bg-white dark:bg-[#22252A] p-6 text-center shadow-lg">
      <h1 className="text-lg font-black">Bru Fin local database</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {canRetry && <button onClick={bootApp} className="mt-4 rounded-xl bg-[#59171B] px-4 py-2 text-sm font-bold text-white">Retry</button>}
    </section>
  </main>
);

const bootApp = async () => {
  renderStartupMessage('Opening your private on-device database…', false);
  try {
    await initializeLocalDatabase();
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('BruFin local database could not be opened', error);
    renderStartupMessage('BruFin could not open its local database. Your existing data has not been intentionally removed. Close other BruFin tabs, then retry.', true);
  }
};

void bootApp();
