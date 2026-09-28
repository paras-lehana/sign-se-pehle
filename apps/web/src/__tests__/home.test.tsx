/**
 * Home page tests: hero (one h1, calls to action, trust chips), decorative art hidden from
 * assistive technology, the workspace section, the marquee read once, and the bento grid.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DOCUMENT_TYPES } from '../components/home/DocTypeMarquee';
import { FEATURES } from '../components/home/FeatureBento';
import { TRUST_CHIPS } from '../components/home/Hero';
import { AnalyzePage } from '../pages/AnalyzePage';
import { renderAt } from './helpers';

describe('Home page', () => {
  it('opens with the kinetic headline as the only h1', () => {
    renderAt(<AnalyzePage />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName('Understand every clause before you sign.');
  });

  it('offers the two calls to action and the trust chips', () => {
    renderAt(<AnalyzePage />);
    expect(screen.getByRole('link', { name: 'Check a document' })).toHaveAttribute(
      'href',
      '#workspace',
    );
    expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute(
      'href',
      '/about',
    );
    const trust = screen.getByRole('list', { name: 'Why you can rely on it' });
    expect(within(trust).getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      TRUST_CHIPS.map((chip) => `✓${chip}`),
    );
  });

  it('keeps the scan illustration out of the accessibility tree', () => {
    const { container } = renderAt(<AnalyzePage />);
    const art = container.querySelector('svg.scan');
    expect(art).not.toBeNull();
    expect(art?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the form inside the #workspace section', () => {
    const { container } = renderAt(<AnalyzePage />);
    const workspace = screen.getByRole('region', { name: 'Check a document' });
    expect(workspace).toBe(container.querySelector('#workspace'));
    expect(within(workspace).getByRole('form', { name: 'Your document' })).toBeInTheDocument();
  });

  it('lists each document type once for screen readers', () => {
    renderAt(<AnalyzePage />);
    const marquee = screen.getByRole('region', {
      name: 'Reads the documents India signs every day',
    });
    expect(within(marquee).getAllByRole('listitem')).toHaveLength(DOCUMENT_TYPES.length);
  });

  it('renders one titled tile per feature in the bento grid', () => {
    renderAt(<AnalyzePage />);
    const bento = screen.getByRole('region', { name: 'Everything you need before you sign' });
    expect(
      within(bento)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(FEATURES.map((feature) => feature.title));
  });

  it('shows what you get before asking for a document', () => {
    renderAt(<AnalyzePage />);
    const bento = screen.getByRole('region', { name: 'Everything you need before you sign' });
    const workspace = screen.getByRole('region', { name: 'Check a document' });
    // DOCUMENT_POSITION_FOLLOWING: bento is earlier in the document than the workspace section.
    expect(bento.compareDocumentPosition(workspace) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
