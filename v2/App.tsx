import React, { Suspense, useState, useEffect, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Terminal, Search, Github, Settings, SearchCode, Sparkles } from 'lucide-react';
import { TOOLS } from './src/lib/tools.registry';
import { EXAMPLES, ToolExample } from './src/lib/examples.data';
import { ErrorBoundary } from 'react-error-boundary';
import { CommandPalette } from './src/components/CommandPalette';
import { Header } from './src/components/Header';
import { Footer } from './src/components/Footer';

// Page Imports (Lazy Loaded)
const Home = lazy(() => import('./src/pages/Home'));
const Blog = lazy(() => import('./src/pages/Blog'));
const BlogPost = lazy(() => import('./src/pages/BlogPost'));
const Changelog = lazy(() => import('./src/pages/Changelog').then(module => ({ default: module.Changelog })));
const Manifesto = lazy(() => import('./src/pages/Manifesto').then(module => ({ default: module.Manifesto })));
const About = lazy(() => import('./src/pages/About'));
const Features = lazy(() => import('./src/pages/Features'));
const Pricing = lazy(() => import('./src/pages/Pricing'));
const Contact = lazy(() => import('./src/pages/Contact'));
const NotFound = lazy(() => import('./src/pages/NotFound'));

const PageSkeleton = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
     <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
  </div>
);

const AIOptInModal = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('AI_OPT_IN_REQUEST', handler);
        return () => window.removeEventListener('AI_OPT_IN_REQUEST', handler);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base/80 backdrop-blur" style={{position: 'fixed'}}>
          <div className="bg-surface border border-subtle rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
               <span className="text-indigo-400">✨</span> Enable AI Features?
            </h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">
               You are about to use an AI feature. Your input data for this specific action will be sent to the <strong>Google Gemini API</strong> for processing.<br/><br/>This is the <em>only</em> time data leaves your device. Do you want to proceed?
            </p>
            <div className="flex justify-end gap-3">
               <button className="px-4 py-2 border border-subtle rounded-md text-muted hover:bg-elevated text-sm font-medium transition-colors" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('AI_OPT_IN_RESPONSE', { detail: { approved: false } })); }}>Cancel</button>
               <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 text-white rounded-md text-sm font-medium transition-colors" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('AI_OPT_IN_RESPONSE', { detail: { approved: true } })); }}>Allow & Proceed</button>
            </div>
          </div>
        </div>
    );
};

const SimpleTextPage = ({ title, content }: { title: string, content: React.ReactNode }) => (
  <div className="max-w-3xl mx-auto py-24 px-6">
    <Helmet><title>{title} | CyberScryb</title></Helmet>
    <h1 className="text-4xl font-bold mb-8 text-primary tracking-tight">{title}</h1>
    <div className="prose prose-invert prose-lg text-muted">{content}</div>
  </div>
);

const Layout = () => {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen font-sans bg-base text-primary flex flex-col selection:bg-accent/30 selection:text-white">
      <Header onSearchClick={() => setCmdOpen(true)}/>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      <main className="flex-1 flex flex-col relative w-full overflow-x-hidden">
        <ErrorBoundary fallback={<div className="p-12 text-danger font-mono border border-danger/30 m-6 rounded bg-danger/5">Exception thrown during render.</div>}>
           <Suspense fallback={<PageSkeleton />}>
             <Outlet />
           </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

const ToolRouteWrapper = ({ tool }: { tool: any }) => {
  const Component = tool.component;
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Helmet>
        <title>{tool.name} | CyberScryb</title>
        <meta name="description" content={tool.description} />
      </Helmet>
      <Suspense fallback={<PageSkeleton/>}>
         <Component config={tool} onClose={() => navigate('/')} />
      </Suspense>
    </div>
  );
};

const ExampleRouteWrapper = ({ example, tool }: { example: ToolExample, tool: any }) => {
  const Component = tool.component;
  const navigate = useNavigate();
  
  // Inject state before render
  if (typeof window !== 'undefined') {
     (window as any).__CYBER_EXAMPLE_STATE = example.state;
  }

  const faqSchema = {
     "@context": "https://schema.org",
     "@type": "FAQPage",
     "mainEntity": example.faq.map(q => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
           "@type": "Answer",
           "text": q.answer
        }
     }))
  };

  return (
    <div className="flex flex-col min-h-screen bg-base pb-24">
       <Helmet>
         <title>{example.title}</title>
         <meta name="description" content={example.metaDescription} />
         <link rel="canonical" href={`https://cyberscryb.com/tools/${tool.slug}/examples/${example.exampleSlug}`} />
         <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
       </Helmet>

       <div className="max-w-7xl mx-auto w-full px-6 py-12">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6">{example.h1}</h1>
          <p className="text-xl text-muted leading-relaxed max-w-3xl mb-12">{example.paragraph}</p>
          
          <div className="h-[700px] border border-subtle rounded-2xl overflow-hidden shadow-2xl relative bg-base">
             <Suspense fallback={<PageSkeleton/>}>
                <Component config={tool} onClose={() => navigate('/')} />
             </Suspense>
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
             <div className="lg:col-span-2 space-y-8">
                <h3 className="text-xl font-bold text-white border-b border-subtle pb-4">Frequently Asked Questions</h3>
                <div className="space-y-6">
                   {example.faq.map((q, i) => (
                      <div key={i}>
                         <h4 className="font-bold text-accent mb-2">{q.question}</h4>
                         <p className="text-muted leading-relaxed">{q.answer}</p>
                      </div>
                   ))}
                </div>
             </div>
             
             <div>
                <h3 className="text-[10px] font-mono text-muted uppercase tracking-widest font-bold mb-4">Related Patterns</h3>
                <div className="flex flex-col gap-2">
                   {example.relatedLinks.map((link, i) => (
                      <Link key={i} to={link.url} className="px-4 py-3 bg-surface hover:bg-elevated border border-transparent hover:border-subtle rounded-lg text-primary transition-colors text-sm">
                         {link.title}
                      </Link>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const oldSlugMap: Record<string, string> = {
  'base64-studio': 'base64',
  'password-checker': 'password',
  'hash-forge': 'hash',
  'encryption-lab': 'encryption',
  'jwt-inspector': 'jwt',
  'uuid-forge': 'uuid',
  'json-visualizer': 'json',
  'timestamp-studio': 'timestamp',
  'json-csv-studio': 'json-csv',
  'diff-viewer': 'diff',
  'cron-builder': 'cron',
  'markdown-lab': 'markdown',
  'regex-playground-pro': 'regex',
  'curl-to-code': 'curl',
  'gig-auto-pilot': 'gig',
  'legal-boilerplate-studio': 'legal',
  'seo-meta-studio': 'seo',
  'http-status-lab': 'http',
  'image-studio': 'exif',
  'svg-optimizer': 'svg',
  'qr-barcode-forge': 'qr',
  'color-palette-studio': 'color',
  'anti-ai-humanizer': 'humanize',
  'lorem-ipsum-plus': 'lorem',
  'text-toolkit': 'text',
};

const LegacySlugRedirect = () => {
    const location = useLocation();
    const pathParts = location.pathname.split('/');
    
    // Check if it's an old /tools/old-slug... route
    const toolsIndex = pathParts.indexOf('tools');
    if (toolsIndex !== -1 && pathParts.length > toolsIndex + 1) {
        const potentialOldSlug = pathParts[toolsIndex + 1];
        if (oldSlugMap[potentialOldSlug]) {
            pathParts[toolsIndex + 1] = oldSlugMap[potentialOldSlug];
            return <Navigate to={pathParts.join('/') + location.search + location.hash} replace />;
        }
    }
    
    // Check if it's the really old /t/slug route
    const tIndex = pathParts.indexOf('t');
    if (tIndex !== -1 && pathParts.length > tIndex + 1) {
        const potentialSlug = pathParts[tIndex + 1];
        const newSlug = oldSlugMap[potentialSlug] || potentialSlug;
        pathParts[tIndex] = 'tools';
        pathParts[tIndex + 1] = newSlug;
        return <Navigate to={pathParts.join('/') + location.search + location.hash} replace />;
    }

    return <NotFound />;
};

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AIOptInModal />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="blog" element={<Blog />} />
            <Route path="changelog" element={<Changelog />} />
            <Route path="manifesto" element={<Manifesto />} />
            <Route path="blog/:id" element={<BlogPost />} />
            <Route path="privacy" element={<SimpleTextPage title="Privacy Policy" content={<><p>We don't collect your data. Everything runs locally in your browser. Period.</p><p>If you use a tool that connects to an external API (which you must opt-in to), data is sent directly from your client to that API.</p></>} />} />
            <Route path="terms" element={<SimpleTextPage title="Terms of Service" content={<><p>Use these tools at your own risk. We provide them "as is" without warranty.</p></>} />} />
            <Route path="about" element={<About />} />
            <Route path="features" element={<Features />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="contact" element={<Contact />} />
            {TOOLS.map(tool => (
                <Route key={tool.slug} path={"tools/" + tool.slug} element={<ToolRouteWrapper tool={tool} />} />
            ))}
            {EXAMPLES.map(ex => {
                const tool = TOOLS.find(t => t.slug === ex.toolSlug);
                if (!tool) return null;
                return (
                   <Route key={`${ex.toolSlug}-${ex.exampleSlug}`} path={`tools/${ex.toolSlug}/examples/${ex.exampleSlug}`} element={<ExampleRouteWrapper example={ex} tool={tool} />} />
                );
            })}
            <Route path="*" element={<LegacySlugRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}

