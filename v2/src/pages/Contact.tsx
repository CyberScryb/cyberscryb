import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    type: 'support'
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    const newErrors: { name?: string; email?: string; message?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Please tell us your name';
    if (!formData.email.trim()) {
      newErrors.email = 'Please provide an email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.message.trim()) newErrors.message = 'Please type a message';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    // Simulate API Submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', message: '', type: 'support' });
    }, 1200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact & Feedback Support | CyberScryb</title>
        <meta name="description" content="Reach out to the CyberScryb developer for bug reports, tool suggestions, or enterprise privacy support queries." />
      </Helmet>

      <section className="relative py-24 px-6 max-w-4xl mx-auto flex flex-col items-center">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/3 w-[300px] h-[300px] bg-hover/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-subtle text-[10px] uppercase tracking-widest font-mono text-accent mb-4">
            Get In Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Need help? Let's chat.
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto">
            Drop a message for bug reports, feature suggestions, or general support queries. I review emails personally.
          </p>
        </div>

        <div className="w-full max-w-xl relative z-10">
          {isSubmitted ? (
            <Card className="border-accent bg-accent/5 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <CardContent className="flex flex-col items-center justify-center p-0">
                <CheckCircle className="w-12 h-12 text-[#00D17A] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Message Dispatched!</h3>
                <p className="text-sm text-muted leading-relaxed max-w-sm mb-6">
                  Thank you for reaching out. I'll read your feedback and get back to you within 24-48 hours.
                </p>
                <Button variant="secondary" onClick={() => setIsSubmitted(false)}>
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 md:p-8 bg-surface border-subtle">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full bg-base border rounded-lg px-4 py-3 text-sm text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                        errors.name ? 'border-danger' : 'border-subtle hover:border-strong'
                      }`}
                      placeholder="e.g. John Doe"
                    />
                    {errors.name && (
                      <span className="text-xs text-danger flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {errors.name}
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="type" className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                      Topic
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full bg-base border border-subtle hover:border-strong rounded-lg px-4 py-3 text-sm text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="support">Bug Report / Support</option>
                      <option value="suggest">Tool Suggestion</option>
                      <option value="enterprise">Self-Hosted / Enterprise</option>
                      <option value="other">Other Inquiry</option>
                    </select>
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full bg-base border rounded-lg px-4 py-3 text-sm text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                      errors.email ? 'border-danger' : 'border-subtle hover:border-strong'
                    }`}
                    placeholder="e.g. you@example.com"
                  />
                  {errors.email && (
                    <span className="text-xs text-danger flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {errors.email}
                    </span>
                  )}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className={`w-full bg-base border rounded-lg px-4 py-3 text-sm text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y ${
                      errors.message ? 'border-danger' : 'border-subtle hover:border-strong'
                    }`}
                    placeholder="Describe how we can help..."
                  />
                  {errors.message && (
                    <span className="text-xs text-danger flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {errors.message}
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="w-full justify-center"
                  rightIcon={<ArrowRight size={14} />}
                >
                  Send Message
                </Button>
              </form>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
