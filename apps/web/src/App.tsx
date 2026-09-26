/**
 * Route table and app shell.
 *
 * Responsibility: map URLs to pages inside the shared layout. Boundary: the router
 * itself is supplied by the caller (BrowserRouter in the browser, MemoryRouter in tests).
 */
import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AboutPage } from './pages/AboutPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { ComparePage } from './pages/ComparePage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AnalyzePage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
