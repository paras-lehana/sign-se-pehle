/**
 * Browser entry point.
 *
 * Responsibility: apply the stored display preferences, load fonts and styles, and mount
 * the app with the history router. Boundary: no logic here; routes and layout live in
 * App.tsx. Fonts are self-hosted variable files bundled from npm (no external requests).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import { App } from './App';
import { applyStoredPreferences } from './components/layout/preferences';
import './styles/tokens.css';
import './styles/base.css';
import './styles/primitives.css';
import './styles/layout.css';
import './styles/footer.css';
import './styles/home.css';
import './styles/illustration.css';
import './styles/marquee.css';
import './styles/bento.css';
import './styles/tile-visuals.css';
import './styles/forms.css';
import './styles/workspace.css';
import './styles/tabs.css';
import './styles/report.css';
import './styles/score.css';
import './styles/report-cards.css';
import './styles/report-panels.css';
import './styles/report-ask.css';
import './styles/content.css';
import './styles/features.css';
import './styles/print.css';

// Before the first render, so a reader who chose light never sees a dark flash.
applyStoredPreferences();

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
