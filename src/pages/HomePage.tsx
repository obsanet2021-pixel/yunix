import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video, ExternalLink, Play, Youtube, Send, Instagram, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TikTokIcon from "@/components/icons/TikTokIcon";
import YunixLogo from "@/components/YunixLogo";
import MobileNavigation from "@/components/MobileNavigation";

// Landing components
import ScrollProgress from "@/components/landing/ScrollProgress";
import ScrollGradientBackground from "@/components/landing/ScrollGradientBackground";
import ParticleField from "@/components/landing/ParticleField";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import StatsSection from "@/components/landing/StatsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import ScrollReveal from "@/components/landing/ScrollReveal";
import MarketTicker from "@/components/landing/MarketTicker";
import ComparisonTable from "@/components/landing/ComparisonTable";
import MetricsSection from "@/components/landing/MetricsSection";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  published: boolean;
  created_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userCount, setUserCount] = useState(100);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/app/dashboard");
      }
      setLoading(false);
    });
    fetchCourses();
    fetchUserCount();
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3);
    if (data) setCourses(data);
  };

  const fetchUserCount = async () => {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    if (count !== null && count > 0) setUserCount(count);
  };

  // Real-time subscription for user count
  useEffect(() => {
    const subscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          // Optimistic update: increment/decrement based on event
          if (payload.eventType === 'INSERT') {
            setUserCount(prev => prev + 1);
          } else if (payload.eventType === 'DELETE') {
            setUserCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="scroll-snap-container-smooth bg-background relative">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Scroll-responsive Background Effects */}
      <ScrollGradientBackground />
      <ParticleField particleCount={35} interactive />
      
      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Navigation */}
      <header id="navbar" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${isScrolled ? 'bg-background/85 backdrop-blur-2xl border-b border-border' : 'bg-transparent border-b border-transparent'}`} role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <YunixLogo />
            <nav className="hidden md:flex items-center gap-2" role="navigation" aria-label="Main navigation">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Features</a>
              <a href="#compare" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Compare</a>
              <a href="#courses" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Courses</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Reviews</a>
              <Link to="/pricing" className="text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 transition-all duration-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Pricing</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:inline-flex px-5 py-2 h-10 text-sm font-medium text-muted-foreground border border-border hover:text-foreground hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">Sign In</Button>
              <Button onClick={() => navigate("/auth")} className="hidden sm:inline-flex px-6 py-2 h-10 text-sm font-semibold bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-lg shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">Start Free →</Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 min-h-[44px] min-w-[44px]"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNavigation isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Scroll-based Narrative Sections with Snap */}
      <main id="main-content" className="scroll-snap-section">
        <HeroSection userCount={userCount} />
      </main>
      
      {/* Market Ticker */}
      <MarketTicker />
      
      <section className="scroll-snap-section" aria-labelledby="problem-heading">
        <ProblemSection />
      </section>
      <section className="scroll-snap-section" aria-labelledby="solution-heading">
        <SolutionSection />
      </section>
      <section id="features" aria-labelledby="features-heading">
        <FeatureShowcase />
      </section>

      {/* Comparison Table */}
      <ComparisonTable />

      {/* Metrics Section */}
      <MetricsSection />

      {/* Courses Section */}
      {courses.length > 0 && (
        <section id="courses" className="scroll-snap-section py-20 lg:py-32 px-4 sm:px-6 lg:px-8" aria-labelledby="courses-heading">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <Badge variant="secondary" className="mb-4">Education</Badge>
                <h2 id="courses-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Latest Courses</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start learning with our featured courses designed by expert traders.</p>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" role="list">
              {courses.map((course, index) => (
                <ScrollReveal key={course.id} direction="up" delay={index * 100}>
                  <Card className="glow-card overflow-hidden cursor-pointer group" onClick={() => navigate("/auth")} role="listitem" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate("/auth")}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={`Course thumbnail: ${course.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" aria-hidden="true"><Video className="h-12 w-12 text-muted-foreground" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <Button size="sm" variant="secondary" className="gap-2" aria-label={`Start course: ${course.title}`}><Play className="h-4 w-4" />Start Course</Button>
                      </div>
                    </div>
                    <CardHeader className="p-5">
                      <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                      {course.category && <Badge variant="outline" className="w-fit mt-2">{course.category}</Badge>}
                      <CardDescription className="line-clamp-2 mt-2">{course.description || "No description available"}</CardDescription>
                    </CardHeader>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-muted-foreground">More courses at <Link to="/courses" className="text-primary hover:underline font-semibold inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">YUNIX Education</Link></p>
            </div>
          </div>
        </section>
      )}

      <section className="scroll-snap-section" aria-labelledby="stats-heading">
        <StatsSection userCount={userCount} />
      </section>
      <section className="scroll-snap-section" aria-labelledby="testimonials-heading">
        <TestimonialsSection />
      </section>
      <section className="scroll-snap-section" aria-labelledby="cta-heading">
        <CTASection />
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border bg-card" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <YunixLogo />
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-[200px]">
                The AI-powered trading journal built for disciplined, funded traders.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.youtube.com/@yunixgroup?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground text-sm"
                  aria-label="Follow YUNIX on YouTube"
                >
                  YT
                </a>
                <a
                  href="https://t.me/OfficialYunix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground text-sm"
                  aria-label="Join YUNIX Telegram"
                >
                  TG
                </a>
                <a
                  href="https://www.instagram.com/yunixofficial1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground text-sm"
                  aria-label="Follow YUNIX on Instagram"
                >
                  IG
                </a>
                <a
                  href="https://www.tiktok.com/@yunixofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground text-sm"
                  aria-label="Follow YUNIX on TikTok"
                >
                  TK
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Features</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Analytics</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">AI Assistant</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Backtesting</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Pricing</a></li>
              </ul>
            </div>

            {/* Education */}
            <div>
              <h4 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Education</h4>
              <ul className="space-y-3">
                <li><a href="#courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">All Courses</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Forex Basics</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Risk Management</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Funded Trading</a></li>
                <li><a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Strategy Building</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Company</h4>
              <ul className="space-y-3">
                <li><a href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">About</a></li>
                <li><a href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Blog</a></li>
                <li><a href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Careers</a></li>
                <li><a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Contact</a></li>
                <li><a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 YUNIX. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground font-mono text-xs">
              v2.0 · Built for traders, by traders
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
