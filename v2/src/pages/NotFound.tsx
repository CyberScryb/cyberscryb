import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Terminal as TerminalIcon, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 Page Not Found | CyberScryb</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono py-24">
        <div className="max-w-md w-full bg-surface border border-strong rounded-xl p-6 relative overflow-hidden group shadow-2xl">
          {/* Neon terminal line background */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />

          <div className="flex flex-col gap-2 text-left relative z-20">
            <div className="flex items-center gap-2 text-accent mb-4 font-bold">
              <TerminalIcon size={16} />
              <span>$ cd /routes/requested</span>
            </div>

            <div className="text-danger mb-2 flex items-start gap-1.5 leading-relaxed font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>bash: cd: /routes/requested: Route undefined (404)</span>
            </div>

            <div className="mb-8 text-sm text-muted leading-relaxed">
              The route you requested could not be resolved by our client-side routing tables. Check
              your URL address or jump back to the core utilities list.
            </div>

            <Link to="/" className="w-fit">
              <Button variant="primary" size="md">
                Return to Root
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
