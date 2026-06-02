import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, BookOpen, GraduationCap, BarChart3, Target, Brain, 
  ChevronRight, Play, LineChart, Youtube, Send, Instagram
} from "lucide-react";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const features = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Track your performance with real-time insights and comprehensive metrics."
  },
  {
    icon: BookOpen,
    title: "Trade Journal",
    description: "Document every trade with notes, emotions, and screenshots."
  },
  {
    icon: Target,
    title: "Smart Backtesting",
    description: "Test strategies with historical data and replay functionality."
  },
  {
    icon: Brain,
    title: "AI Trading Assistant",
    description: "Get personalized advice powered by AI trained on your data."
  },
  {
    icon: TrendingUp,
    title: "Account Tracking",
    description: "Monitor multiple accounts and track progress toward goals."
  },
  {
    icon: GraduationCap,
    title: "Expert Courses",
    description: "Access premium educational content to accelerate learning."
  }
];

const stats = [
  { value: "10K+", label: "Active Traders" },
  { value: "500K+", label: "Trades Analyzed" },
  { value: "98%", label: "Success Rate" }
];

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/app/dashboard");
      }
      setLoading(false);
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/95 backdrop-blur-lg border-b border-border shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <LineChart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">YUNIX</span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="shadow-sm">
                Get Started
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6">
              Success in Trading{" "}
              <span className="gradient-text">Begins Today</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Join hundreds of disciplined traders who trust YUNIX to track, analyze, and master their trading journey with AI-powered insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg btn-gradient"
              >
                Get Started Free
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Product Screenshot */}
            <div className="relative max-w-5xl mx-auto">
              <div className="glow-card rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="/hero-screenshot-1.png" 
                  alt="YUNIX Trading Platform Dashboard"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for serious traders.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glow-card group">
                <CardContent className="p-6 lg:p-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="glow-card overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent" />
            <CardContent className="relative p-8 sm:p-12 lg:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Transform Your Trading?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of successful traders who use YUNIX to track, analyze, 
                and improve their trading performance every day.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="px-8 h-12 text-base font-semibold shadow-lg"
              >
                Start Trading Smarter Today
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <LineChart className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">YUNIX</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your professional trading platform.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.youtube.com/@yunixgroup?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
                <a
                  href="https://t.me/OfficialYunix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </a>
                <a
                  href="https://www.instagram.com/yunixofficial1?igsh=N2wzamd2OTF0aDll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://www.tiktok.com/@yunixofficial?_r=1&_t=ZS-92P31kwqlQD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <TikTokIcon className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trade Journal</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analytics</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Backtesting</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tutorials</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Reference</Link></li>
                <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Community</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 YUNIX. All rights reserved.| Developed by <a href="https://obsan2021.github.io/clover-digital/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clover Digital</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
