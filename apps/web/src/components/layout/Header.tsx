/**
 * Site header with product name, tagline, primary navigation and theme toggle.
 *
 * Responsibility: brand + nav. Boundary: NavLink marks the current page with
 * aria-current so the active item is announced, not only coloured.
 */
import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: 'Explain' },
  { to: '/compare', label: 'Compare' },
  { to: '/about', label: 'About' },
] as const;

export function Header(): ReactElement {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__name">Sign Se Pehle</span>
          <span className="brand__tagline">Understand every clause before you sign</span>
        </Link>
        <div className="site-header__actions">
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
