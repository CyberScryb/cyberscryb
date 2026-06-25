import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Heart, Activity, Code, Star, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Our Journey & Backstory | CyberScryb</title>
        <meta name="description" content="Read the backstory of CyberScryb, developed by a night-shift CNA who shipped 29 local developer and productivity tools between patient care rounds." />
      </Helmet>

      <section className="relative py-24 px-6 max-w-4xl mx-auto flex flex-col items-center">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-subtle text-[10px] uppercase tracking-widest font-mono text-accent mb-4">
            Our Origin Story
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Shipped between patient rounds.
          </h1>
          <p className="text-lg md:text-xl text-muted leading-relaxed max-w-2xl mx-auto">
            CyberScryb wasn't built by a venture-backed tech agency in Silicon Valley. It was built in hospital hallways during 12-hour night shifts.
          </p>
        </div>

        {/* Narrative Section */}
        <div className="prose prose-invert max-w-none text-muted space-y-6 leading-relaxed text-sm md:text-base relative z-10">
          <p>
            Hi, I'm **Nathan Ady**, a Certified Nursing Assistant (CNA) and self-taught developer. During long night shifts at the care facility, when patients were resting, I spent the quiet hours between my vital checks and patient rounds coding and building tools. 
          </p>
          <p>
            What started as a single utility script quickly expanded into **29 independent, privacy-first tools**. I realized that developers and regular users were constantly pasting sensitive data—like JSON Web Tokens, cryptographic hashes, and private family support letters—into sketchy, ad-riddled online templates. All of that data was being sent straight to backend servers to be logged and stored.
          </p>
          <p>
            I built CyberScryb to solve this. Our tools perform all processes inside your browser's RAM, utilizing modern Web Crypto APIs and WebAssembly. Nothing is transmitted over the wire unless you explicitly request and opt-in to optional AI assistance.
          </p>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16 relative z-10">
          <Card className="hover:border-accent/20 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Activity className="text-accent w-5 h-5" />
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-white">The Night Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white mb-1">12-Hour</p>
              <p className="text-xs text-muted">Hospital shifts spent balancing patient care and codebase builds.</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-accent/20 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Code className="text-hover w-5 h-5" />
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-white">Local Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white mb-1">29 Utilities</p>
              <p className="text-xs text-muted">Developed client-side to ensure zero data logs or remote tracking.</p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-accent/20 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Heart className="text-danger w-5 h-5 animate-pulse" />
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-white">Philosophy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white mb-1">100% Honest</p>
              <p className="text-xs text-muted">No VC backing, no telemetry, no cookies. Just software that works.</p>
            </CardContent>
          </Card>
        </div>

        {/* CNA Wedge callout */}
        <div className="mt-16 w-full p-8 border border-subtle bg-surface/50 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-hover/5 rounded-full blur-[50px] pointer-events-none" />
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Terminal size={18} className="text-accent" /> Developer & CNA Utilities
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            Because of my medical background, I noticed how hard it was for healthcare workers to draft clear patient shift handouts or for parents to generate structured court-admissible custody sheets. That's why CyberScryb offers unique developer templates alongside legal family plans and CNA shift report assistants. It's built for real people who need help fast.
          </p>
        </div>
      </section>
    </>
  );
}
