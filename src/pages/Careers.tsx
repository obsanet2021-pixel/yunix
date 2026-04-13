import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, ArrowLeft } from "lucide-react";
import YunixLogo from "@/components/YunixLogo";

export default function Careers() {
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
        <div className="text-center mb-12">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Careers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            At YUNIX, we are building systems that traders can trust.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            We are always interested in working with individuals who value precision, responsibility, 
            and long-term thinking. Whether your background is in development, design, operations, 
            support, or education, what matters most is your ability to think clearly and work with integrity.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            If you are interested in contributing to a growing fintech platform focused on discipline 
            and transparency, we encourage you to reach out.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50 mt-12">
          <CardContent className="p-8 text-center">
            <h3 className="font-semibold text-lg mb-2">Current Openings</h3>
            <p className="text-muted-foreground">
              Current openings and collaboration opportunities will be announced here.
            </p>
          </CardContent>
        </Card>

        <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border">
          <h3 className="font-semibold mb-2">Interested in joining?</h3>
          <p className="text-muted-foreground text-sm">
            Send your resume and a brief introduction to{" "}
            <a href="mailto:careers@yunix.com" className="text-primary hover:underline">
              careers@yunix.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}