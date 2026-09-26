/**
 * Browser entry point.
 *
 * Responsibility: mount the app with the history router and load global styles.
 * Boundary: no logic here; routes and layout live in App.tsx.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/forms.css';
import './styles/report.css';
import './styles/content.css';

const container = document.getElementById('root');
if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
