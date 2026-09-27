/**
 * Sticky glass header: logo mark + name, primary navigation, motion and theme toggles, and
 * the scroll-progress bar.
 *
 * Responsibility: brand + nav. Boundary: NavLink marks the current page with aria-current
 * so the active item is announced, not only coloured. The progress bar is pure CSS (a
 * scroll-driven animation) and decorative, so it is hidden from assistive technology.
 */
import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { MotionToggle } from './MotionToggle';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: 'Explain' },
  { to: '/compare', label: 'Compare' },
  { to: '/about', label: 'About' },
] as const;

export function Header(): ReactElement {
  return (
    <header className="site-header scroll-linked">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">Sign Se Pehle</span>
            <span className="brand__tagline">Understand every clause before you sign</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <ul role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <MotionToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="scroll-progress scroll-linked" aria-hidden="true" />
    </header>
  );
}
