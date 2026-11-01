import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
