import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-subtle bg-base pt-16 pb-8 px-6 text-sm">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div>
            <h4 className="font-bold text-primary mb-4 font-mono uppercase tracking-widest text-xs">Utilities</h4>
            <ul className="space-y-3 text-muted">
              <li><Link to="/tools/jwt" className="hover:text-hover transition-colors">JWT Decoder</Link></li>
              <li><Link to="/tools/regex" className="hover:text-hover transition-colors">Regex Engine</Link></li>
              <li><Link to="/tools/diff" className="hover:text-hover transition-colors">Diff Viewer</Link></li>
              <li><Link to="/tools/json" className="hover:text-hover transition-colors">JSON Formatter</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-4 font-mono uppercase tracking-widest text-xs">Product</h4>
            <ul className="space-y-3 text-muted">
              <li><Link to="/features" className="hover:text-hover transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-hover transition-colors">Pricing Options</Link></li>
              <li><Link to="/about" className="hover:text-hover transition-colors">Backstory</Link></li>
              <li><Link to="/contact" className="hover:text-hover transition-colors">Get Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-4 font-mono uppercase tracking-widest text-xs">Compliance</h4>
            <ul className="space-y-3 text-muted">
              <li><Link to="/privacy" className="hover:text-hover transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-hover transition-colors">Terms of Service</Link></li>
              <li><Link to="/manifesto" className="hover:text-hover transition-colors">Our Manifesto</Link></li>
              <li><Link to="/changelog" className="hover:text-hover transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-4 font-mono uppercase tracking-widest text-xs">Developer</h4>
            <ul className="space-y-3 text-muted flex flex-col gap-2">
              <li>
                <a 
                  href="https://github.com/CyberScryb/cyberscryb" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-hover transition-colors p-2 bg-surface rounded-full border border-subtle inline-flex items-center justify-center w-9 h-9"
                  aria-label="GitHub Repository"
                >
                  <Github size={20}/>
                </a>
              </li>
              <li className="text-xs text-faint font-mono">
                Site Version: 2.0.0
              </li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-muted font-mono gap-4 border-t border-subtle pt-8">
          <div className="flex items-center gap-3">
            <span>&copy; {new Date().getFullYear()} CyberScryb LLC.</span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-subtle rounded-md">
              Made with <Heart size={12} className="text-danger animate-pulse" /> by a night-shift CNA
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="opacity-50">Local Host Verified</span>
            <div className="flex items-center gap-2 text-[#00D17A]">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span> 
              All systems online
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
