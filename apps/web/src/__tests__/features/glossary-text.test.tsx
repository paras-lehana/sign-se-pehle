/**
 * GlossaryText: terms found by core become disclosure buttons whose meaning popover
 * opens on tap and closes with Escape, the close button or a click outside.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GLOSSARY, findGlossaryTerms } from '@sign-se-pehle/core';
import { GlossaryText, splitByGlossary } from '../../components/features/glossary/GlossaryText';
import { sampleById } from './feature-fixtures';

/** A real clause from the rent sample, so the terms come from the matcher under test. */
const TEXT =
  sampleById('rent-leave-licence')
    .text.split('\n')
    .find((line) => line.includes('LOCK-IN')) ?? '';

function meaningOf(entryId: string): string {
  return GLOSSARY.find((entry) => entry.id === entryId)?.meaning ?? '';
}

describe('GlossaryText', () => {
  const matches = findGlossaryTerms(TEXT);

  it('keeps the text exactly as written and makes each found term a button', () => {
    expect(matches.length).toBeGreaterThan(0);
    const { container } = render(<p>{<GlossaryText text={TEXT} />}</p>);
    expect(container.textContent).toBe(TEXT);
    for (const match of matches) {
      const written = TEXT.slice(match.start, match.end);
      const button = screen.getByRole('button', { name: `${written}: what it means` });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('splits text into pieces that cover it exactly once', () => {
    expect(
      splitByGlossary(TEXT)
        .map((piece) => piece.text)
        .join(''),
    ).toBe(TEXT);
  });

  it('opens the meaning, closes on Escape and returns focus to the term', async () => {
    const user = userEvent.setup();
    const [first] = matches;
    if (first === undefined) throw new Error('No glossary term in the fixture');
    render(<GlossaryText text={TEXT} />);
    const term = screen.getByRole('button', {
      name: `${TEXT.slice(first.start, first.end)}: what it means`,
    });

    await user.click(term);

    expect(term).toHaveAttribute('aria-expanded', 'true');
    const popover = document.getElementById(term.getAttribute('aria-controls') ?? '');
    expect(popover).toHaveTextContent(meaningOf(first.entryId));

    await user.keyboard('{Escape}');

    expect(term).toHaveAttribute('aria-expanded', 'false');
    expect(term).toHaveFocus();
    expect(screen.queryByText(meaningOf(first.entryId))).not.toBeInTheDocument();
  });

  it('closes on a click outside and with its close button', async () => {
    const user = userEvent.setup();
    const [first] = matches;
    if (first === undefined) throw new Error('No glossary term in the fixture');
    const { entryId } = first;
    const name = `${TEXT.slice(first.start, first.end)}: what it means`;
    render(
      <>
        <GlossaryText text={TEXT} />
        <p>Elsewhere on the page</p>
      </>,
    );
    const term = screen.getByRole('button', { name });

    await user.click(term);
    await user.click(screen.getByText('Elsewhere on the page'));
    expect(screen.queryByText(meaningOf(entryId))).not.toBeInTheDocument();

    await user.click(term);
    await user.click(screen.getByRole('button', { name: /^Close the meaning of/ }));
    expect(term).toHaveAttribute('aria-expanded', 'false');
    expect(term).toHaveFocus();
  });

  it('renders plain text untouched when no term appears', () => {
    const plain = 'Rent is due on the fifth.';
    expect(findGlossaryTerms(plain)).toHaveLength(0);
    const { container } = render(<GlossaryText text={plain} />);
    expect(container.textContent).toBe(plain);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
