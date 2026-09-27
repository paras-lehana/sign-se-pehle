/**
 * Tabs tests: WAI-ARIA roles and wiring, roving tabindex, arrow / Home / End keys with
 * wrapping, and mount-on-first-visit panels.
 */
import { type ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { type TabItem, Tabs } from '../components/ui/Tabs';

const ITEMS: readonly TabItem[] = [
  { id: 'one', label: 'One', panel: <p>First panel</p> },
  { id: 'two', label: 'Two', panel: <p>Second panel</p> },
  { id: 'three', label: 'Three', panel: <p>Third panel</p> },
];

interface HarnessProps {
  readonly mountAll?: boolean;
}

/** A parent that owns the selection, as the report and the form do. */
function Harness({ mountAll = false }: HarnessProps): ReactElement {
  const [selected, setSelected] = useState('one');
  return (
    <Tabs
      idPrefix="test"
      label="Test sections"
      items={ITEMS}
      selectedId={selected}
      onSelect={setSelected}
      mountAll={mountAll}
    />
  );
}

const tab = (name: string): HTMLElement => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('wires tablist, tabs and panels with ARIA', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Test sections' })).toBeInTheDocument();
    const first = tab('One');
    expect(first).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'One' });
    expect(first).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', first.id);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('keeps exactly one tab in the tab order (roving tabindex)', async () => {
    render(<Harness />);
    expect(tab('One')).toHaveAttribute('tabindex', '0');
    expect(tab('Two')).toHaveAttribute('tabindex', '-1');
    await userEvent.click(tab('Two'));
    expect(tab('One')).toHaveAttribute('tabindex', '-1');
    expect(tab('Two')).toHaveAttribute('tabindex', '0');
  });

  it('moves and selects with the arrow keys, wrapping at both ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab('One'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Two')).toHaveFocus();
    expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Second panel')).toBeVisible();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(tab('One')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(tab('Three')).toHaveFocus();
    expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab('Two'));
    await user.keyboard('{End}');
    expect(tab('Three')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(tab('One')).toHaveFocus();
    expect(tab('One')).toHaveAttribute('aria-selected', 'true');
  });

  it('mounts a panel on first visit and keeps it afterwards', async () => {
    render(<Harness />);
    expect(screen.queryByText('Third panel')).not.toBeInTheDocument();
    await userEvent.click(tab('Three'));
    expect(screen.getByText('Third panel')).toBeVisible();
    await userEvent.click(tab('One'));
    expect(screen.getByText('Third panel')).not.toBeVisible();
  });

  it('mounts every panel up front with mountAll', () => {
    render(<Harness mountAll />);
    for (const item of ITEMS) {
      expect(document.getElementById(`test-panel-${item.id}`)).not.toBeEmptyDOMElement();
    }
  });
});
