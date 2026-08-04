import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Terminal, Search, Menu, X } from 'lucide-react';

export interface HeaderProps {
  onSearchClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Tools', path: '/' },
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/tools');
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-subtle bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 text-primary font-bold tracking-tight text-lg group outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <Terminal
            size={24}
            className="text-accent group-hover:drop-shadow-[0_0_8px_var(--color-accent-glow)] transition-all"
          />
          <span className="group-hover:text-accent transition-colors relative">
            CyberScryb
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full"></span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
          {navLinks.map(link => (
            <Link
              key={link.name}
              to={link.path}
              className={`transition-colors focus-visible:ring-2 focus-visible:ring-accent rounded px-1.5 py-0.5 ${
                isActive(link.path) ? 'text-accent font-bold' : 'hover:text-hover'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Search Button */}
          <button
            onClick={onSearchClick}
            aria-label="Search tools"
            className="flex items-center gap-2 hover:text-primary transition-colors hover:bg-surface px-3 py-1.5 rounded-lg border border-transparent hover:border-subtle cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Search size={16} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-80 bg-elevated border border-strong rounded px-1">
              Cmd+K
            </span>
          </button>

          {/* Local Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-subtle text-[10px] uppercase tracking-widest font-mono text-[#00D17A]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulse_2s_ease-in-out_infinite]"></span>
            Local
          </div>
        </nav>

        {/* Mobile Nav Button */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={onSearchClick}
            aria-label="Search tools"
            className="p-2 text-muted hover:text-primary cursor-pointer rounded-lg hover:bg-surface"
          >
            <Search size={18} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="p-2 text-muted hover:text-primary cursor-pointer rounded-lg hover:bg-surface border border-transparent hover:border-subtle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-subtle bg-surface/95 backdrop-blur-xl px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-3">
            {navLinks.map(link => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-2 border-b border-subtle/40 ${
                  isActive(link.path) ? 'text-accent font-bold' : 'text-muted hover:text-hover'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="text-xs font-mono text-muted">Execution Mode:</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-base border border-subtle text-[10px] uppercase tracking-widest font-mono text-[#00D17A]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulse_2s_ease-in-out_infinite]"></span>
              100% Local
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};
