import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, Brain, BarChart3, ShieldCheck, Settings, GraduationCap } from "lucide-react";
import YunixLogo from "@/components/YunixLogo";

const blogTopics = [
  {
    title: "Trading Discipline and Psychology",
    description: "Understanding the mental framework required for consistent trading performance.",
    icon: Brain,
  },
  {
    title: "Journaling and Performance Analysis",
    description: "How documentation leads to measurable improvement in trading results.",
    icon: BarChart3,
  },
  {
    title: "Risk Management Principles",
    description: "Essential strategies to protect capital and ensure long-term sustainability.",
    icon: ShieldCheck,
  },
  {
    title: "Platform Updates and System Changes",
    description: "Stay informed about new features and improvements to YUNIX tools.",
    icon: Settings,
  },
  {
    title: "Educational Insights for Serious Traders",
    description: "In-depth content for traders committed to professional growth.",
    icon: GraduationCap,
  },
];

export default function Blog() {
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
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The YUNIX Blog is dedicated to clarity in trading.
          </p>
        </div>

        <div className="prose prose-invert max-w-none mb-12">
          <p className="text-muted-foreground leading-relaxed text-center">
            Our articles are written to inform, not to sell hype. The blog reflects how we think, 
            how we build, and why structure matters in trading.
          </p>
        </div>

        <h2 className="text-2xl font-bold mb-6">Topics We Cover</h2>

        <div className="space-y-4">
          {blogTopics.map((topic, index) => {
            const IconComponent = topic.icon;
            return (
              <Card key={index} className="bg-card/50 backdrop-blur-xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{topic.title}</h3>
                      <p className="text-muted-foreground">{topic.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Articles coming soon. Stay tuned for content focused on clarity and discipline.
          </p>
        </div>
      </main>
    </div>
  );
}