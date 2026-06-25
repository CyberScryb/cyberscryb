import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, ShieldAlert, Sparkles, Zap, Award } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Pricing() {
  const tiers = [
    {
      name: 'Local Sandbox',
      price: '$0',
      description: 'Run everything in your browser. No strings attached.',
      features: [
        'Local WebCrypto generators',
        'Offline client-side processing',
        '0% data transmission to external servers',
        'Zero registration or API keys needed',
        'Completely ad-free basic layout'
      ],
      cta: 'Get Started Free',
      url: '/',
      featured: false,
      icon: Zap
    },
    {
      name: 'CyberScryb Pro',
      price: '$5',
      period: '/mo',
      description: 'Supercharge your local toolkit with secure API assistants.',
      features: [
        'Everything in Local Sandbox',
        'Secure Google Gemini AI API integrations',
        'Local+AI Hybrid humanizers & translation',
        'Unlimited AI template operations',
        'Priority support directly from Nathan (CNA)'
      ],
      cta: 'Subscribe Monthly',
      url: 'https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b', // Stated Stripe checkout link
      featured: true,
      icon: Sparkles
    },
    {
      name: 'CyberScryb Lifetime',
      price: '$29',
      period: ' one-time',
      description: 'Full lifetime access promo. Pay once, use forever.',
      features: [
        'Everything in Pro tier',
        'All future developer tools included',
        'No monthly recurring fees',
        'Private developer discord access channel',
        'Direct feature suggestion requests'
      ],
      cta: 'Get Lifetime Access',
      url: 'https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08', // Lifetime Promo Link
      featured: false,
      icon: Award
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pricing Plans & Upgrades | CyberScryb</title>
        <meta name="description" content="Local-first developer tools for free, or secure AI extensions starting at $5/month. Pricing structured with zero hidden tracking." />
      </Helmet>

      <div className="relative py-24 px-6 max-w-7xl mx-auto flex flex-col items-center">
        {/* Glow backdrop effects */}
        <div className="absolute top-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-12 right-12 w-96 h-96 bg-hover/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="text-center max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-subtle text-[10px] uppercase tracking-widest font-mono text-accent mb-4">
            Membership Plans
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Transparent, utility pricing
          </h1>
          <p className="text-lg text-muted">
            Enjoy full offline local privacy free of charge. Upgrade to support development and access optional AI capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col justify-between p-8 rounded-2xl border transition-all duration-300 ${
                  tier.featured
                    ? 'bg-elevated border-accent shadow-[0_0_30px_rgba(168,85,247,0.08)]'
                    : 'bg-surface border-subtle hover:border-strong'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-bold font-mono uppercase tracking-widest">
                    Popular Option
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-base border border-subtle ${tier.featured ? 'text-accent border-accent/20' : 'text-muted'}`}>
                      <Icon size={18} />
                    </div>
                    <h3 className="text-xl font-mono uppercase font-bold tracking-wider text-white">{tier.name}</h3>
                  </div>
                  
                  <p className="text-sm text-muted mb-6">{tier.description}</p>
                  
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-extrabold text-white">{tier.price}</span>
                    {tier.period && <span className="text-muted text-xs font-mono">{tier.period}</span>}
                  </div>
                  
                  <ul className="space-y-4 mb-8 text-sm text-muted">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-3 items-start">
                        <Check className="w-5 h-5 text-hover shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a 
                  href={tier.url} 
                  target={tier.url !== '/' ? '_blank' : '_self'} 
                  rel="noreferrer" 
                  className="w-full mt-auto"
                >
                  <Button variant={tier.featured ? 'primary' : 'secondary'} className="w-full justify-center">
                    {tier.cta}
                  </Button>
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-16 w-full max-w-4xl p-6 rounded-xl border border-subtle bg-surface/50 flex flex-col sm:flex-row items-center gap-4 text-left">
          <ShieldAlert className="text-[#06b6d4] w-8 h-8 shrink-0" />
          <p className="text-xs text-muted leading-relaxed">
            <strong>Stripe Security Notice:</strong> We do not log, parse, or store payment credentials. Transactions are processed via Stripe checkout forms. Pro features authenticate using local signed cookies verified by Firebase functions.
          </p>
        </div>
      </div>
    </>
  );
}
