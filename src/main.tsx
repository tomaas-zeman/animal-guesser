import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// nahrávací stránka pro namlouvání hlasů se načte jen na ?nahravani
const Nahravani = lazy(() => import('./Nahravani'));
const nahravani = new URLSearchParams(location.search).has('nahravani');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {nahravani ? (
      <Suspense>
        <Nahravani />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
