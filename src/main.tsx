import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalErrorMonitoring, trackEvent } from './utils/monitoring';

initGlobalErrorMonitoring();
trackEvent('app_session_started', 'page_view', {
  path: window.location.pathname,
  userAgent: navigator.userAgent,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
