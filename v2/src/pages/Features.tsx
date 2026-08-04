import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Zap, Cpu, Code, Lock, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Features() {
  const featureList = [
    {
      title: '100% In-Browser Privacy',
      description:
        'Everything runs locally in your RAM. Your text inputs, secrets, JSON payloads, and private certificates never cross the network. Ideal for sensitive enterprise work.',
      icon: Lock,
      accent: 'text-purple-400',
    },
    {
      title: 'Lightning Fast Client-Side WASM',
      description:
        'Powered by WebAssembly and native browser APIs (like WebCrypto). No network latency, no server round-trips, and zero cold starts. It works instantly, every single time.',
      icon: Zap,
      accent: 'text-cyan-400',
    },
    {
      title: 'Consent-First AI Integrations',
      description:
        'Optional advanced tools (like the AI CNA Report and AI proposal humanizer) connect to Google Gemini APIs. They only run when you explicitly approve the opt-in consent prompt.',
      icon: ShieldCheck,
      accent: 'text-green-400',
    },
    {
      title: 'Robust Offline Capability',
      description:
        'Fully functions on airplanes, trains, or inside restricted corporate firewalls. Once the page is loaded or cached, you are completely independent of internet availability.',
      icon: Cpu,
      accent: 'text-blue-400',
    },
    {
      title: 'Developer Ergonomics',
      description:
        'Built-in Cmd+K command palette, quick slash key focuses, instant clipboard actions, tab-trappable inputs, and full keyboard control for heavy keyboard users.',
      icon: Code,
      accent: 'text-orange-400',
    },
    {
      title: 'Zero Dark Patterns',
      description:
        'No annoying tracking scripts, cookie consent wall loops, mandatory registration walls, or sneaky subscription traps. Just utility software built for engineers.',
      icon: HelpCircle,
      accent: 'text-red-400',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Features & Architecture | CyberScryb</title>
        <meta
          name="description"
          content="Explore the local-first security architecture, optional AI opt-ins, and high-performance client tooling of CyberScryb."
        />
      </Helmet>

      <section className="relative py-24 px-6 max-w-7xl mx-auto flex flex-col items-center">
        {/* Decorative Grid and Glow */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="text-center max-w-3xl mb-20 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-subtle text-[10px] uppercase tracking-widest font-mono text-accent mb-4">
            Security Architecture
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Privacy shouldn't be an afterthought.
          </h1>
          <p className="text-lg md:text-xl text-muted leading-relaxed">
            CyberScryb moves the computation from distant, logging-happy cloud servers into your
            local web sandbox. Here is how we do it.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 w-full">
          {featureList.map(feat => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className="group relative overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-[0_4px_20px_var(--color-accent-glow)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-4 pb-3">
                  <div
                    className={`p-2.5 rounded-lg bg-surface border border-subtle group-hover:border-accent/40 group-hover:bg-accent/10 transition-colors`}
                  >
                    <Icon className={`w-5 h-5 ${feat.accent}`} />
                  </div>
                  <CardTitle className="text-base font-bold text-white group-hover:text-accent transition-colors font-mono uppercase tracking-wider">
                    {feat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted leading-relaxed">{feat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
