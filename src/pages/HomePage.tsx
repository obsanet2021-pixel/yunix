import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video, ExternalLink, Play, Youtube, Send, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TikTokIcon from "@/components/icons/TikTokIcon";
import YunixLogo from "@/components/YunixLogo";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="scroll-snap-container-smooth bg-background relative">
      {/* Scroll-responsive Background Effects */}
      <ScrollGradientBackground />
      <ParticleField particleCount={35} interactive />
      
      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/95 backdrop-blur-lg border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <YunixLogo />
            <nav className="hidden md:flex items-center gap-1 bg-background/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full px-2 py-1.5 shadow-lg shadow-black/5">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-full">Features</a>
              <a href="#courses" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-full">Courses</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-full">Testimonials</a>
              <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 px-4 py-2 rounded-full">Contact</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">Sign In</Button>
              <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90 shadow-sm">Get Started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scroll-based Narrative Sections with Snap */}
      <div className="scroll-snap-section">
        <HeroSection userCount={userCount} />
      </div>
      <div className="scroll-snap-section">
        <ProblemSection />
      </div>
      <div className="scroll-snap-section">
        <SolutionSection />
      </div>
      <FeatureShowcase />

      {/* Courses Section */}
      {courses.length > 0 && (
        <section id="courses" className="scroll-snap-section py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <Badge variant="secondary" className="mb-4">Education</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Latest Courses</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start learning with our featured courses designed by expert traders.</p>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {courses.map((course, index) => (
                <ScrollReveal key={course.id} direction="up" delay={index * 100}>
                  <Card className="glow-card overflow-hidden cursor-pointer group" onClick={() => navigate("/auth")}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Video className="h-12 w-12 text-muted-foreground" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <Button size="sm" variant="secondary" className="gap-2"><Play className="h-4 w-4" />Start Course</Button>
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
              <p className="text-muted-foreground">More courses at <a target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-1" href="https://yunix.lovable.app">YUNIX Education<ExternalLink className="h-4 w-4" /></a></p>
            </div>
          </div>
        </section>
      )}

      <div className="scroll-snap-section">
        <StatsSection userCount={userCount} />
      </div>
      <div className="scroll-snap-section">
        <TestimonialsSection />
      </div>
      <div className="scroll-snap-section">
        <CTASection />
      </div>

      {/* Footer */}
      <footer id="contact" className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4"><YunixLogo /></div>
              <p className="text-sm text-muted-foreground mb-4">Your professional trading platform for analysis, education, and growth.</p>
              <div className="flex items-center gap-3">
                <a href="https://www.youtube.com/@yunixgroup?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><Youtube className="h-4 w-4" /></a>
                <a href="https://t.me/OfficialYunix" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><Send className="h-4 w-4" /></a>
                <a href="https://www.instagram.com/yunixofficial1" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><Instagram className="h-4 w-4" /></a>
                <a href="https://www.tiktok.com/@yunixofficial" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><TikTokIcon className="h-4 w-4" /></a>
              </div>
            </div>
            <div><h4 className="font-semibold mb-4">Platform</h4><ul className="space-y-3"><li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li><li><a href="#courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Courses</a></li></ul></div>
            <div><h4 className="font-semibold mb-4">Company</h4><ul className="space-y-3"><li><a href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a></li><li><a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li></ul></div>
            <div><h4 className="font-semibold mb-4">Legal</h4><ul className="space-y-3"><li><a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li><li><a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a></li></ul></div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 YUNIX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
