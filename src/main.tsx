import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// the recording page for recording voices loads only on ?recording
const RecordingPage = lazy(() => import('./RecordingPage'));
const recording = new URLSearchParams(location.search).has('recording');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {recording ? (
      <Suspense>
        <RecordingPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
