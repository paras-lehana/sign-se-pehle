/**
 * Route table and app shell.
 *
 * Responsibility: map URLs to pages inside the shared layout. Boundary: the router
 * itself is supplied by the caller (BrowserRouter in the browser, MemoryRouter in tests);
 * the layout's Suspense boundary covers the lazily loaded pages.
 */
import { type ReactElement, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AnalyzePage } from './pages/AnalyzePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Efficiency: Compare is a second journey; its form and tables load only when visited.
const ComparePage = lazy(async () => {
  const module = await import('./pages/ComparePage');
  return { default: module.ComparePage };
});

// Efficiency: About is read once; the pipeline and service catalogue load only when visited.
const AboutPage = lazy(async () => {
  const module = await import('./pages/AboutPage');
  return { default: module.AboutPage };
});

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
