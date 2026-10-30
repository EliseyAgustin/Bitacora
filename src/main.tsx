import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/figtree';
import App from './App.tsx';
import './assets/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
