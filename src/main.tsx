import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

import App from './App.tsx';
import { ErrorBoundary } from './components/errors/ErrorBoundary.tsx';
import { AuthProvider } from './contexts/AuthProvider.tsx';
import { reloadOnce } from './utils/chunkReload.ts';
import './styles/App.css';

// Um ficheiro JS de antes do último deploy já não existe: recarregar traz a versão nova
// (uma vez; se falhar outra vez, a tela de erro aparece). #33
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
