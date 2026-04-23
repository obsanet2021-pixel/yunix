import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, Users, Shield, ArrowLeft, UserCircle } from "lucide-react";
import YunixLogo from "@/components/YunixLogo";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <YunixLogo />
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <p className="text-lg text-muted-foreground leading-relaxed">
            YUNIX is a trading infrastructure platform built to bring structure, discipline, 
            and credibility to modern traders.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            We focus on providing tools that help traders track performance accurately, manage 
            multiple accounts responsibly, and verify results transparently. Our goal is not to 
            promote unrealistic trading lifestyles, but to support long-term consistency through 
            data, documentation, and accountability.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            YUNIX is designed for funded traders, prop firm traders, and money managers who value 
            professionalism over shortcuts. We believe that real growth in trading comes from 
            structure, not speculation.
          </p>

          <div className="grid md:grid-cols-3 gap-6 my-12">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Structure</h3>
                <p className="text-sm text-muted-foreground">
                  Tools designed for disciplined performance tracking and accountability.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  Verify results transparently with documentation and data.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Professionalism</h3>
                <p className="text-sm text-muted-foreground">
                  Built for traders who value long-term consistency over shortcuts.
                </p>
              </CardContent>
            </Card>
          </div>

          <section className="mt-16">
            <h2 className="text-2xl font-semibold mb-6">Company & Team</h2>
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        Core leadership
                      </p>
                      <h3 className="text-xl font-semibold">YUNIX Executive Team</h3>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">CEO</p>
                    <p className="mt-2 font-semibold">Chief Executive Officer</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">COO</p>
                    <p className="mt-2 font-semibold">Chief Operations Officer</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">CFO</p>
                    <p className="mt-2 font-semibold">Chief Financial Officer</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Engineering</p>
                    <p className="mt-2 font-semibold">Development & Platform Team</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="mt-2 font-semibold">Product & Design Leadership</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Support</p>
                    <p className="mt-2 font-semibold">Customer Success & Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}