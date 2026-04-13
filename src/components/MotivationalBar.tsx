import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Lightbulb, Target, Trophy, TrendingUp, Brain, Zap } from "lucide-react";

const quotes = [
  {
    text: "Risk comes from not knowing what you're doing.",
    icon: Brain,
    color: "text-blue-500"
  },
  {
    text: "The goal of a successful trader is to make the best trades. Money is secondary.",
    icon: Target,
    color: "text-green-500"
  },
  {
    text: "In trading, the impossible happens about twice a year.",
    icon: Zap,
    color: "text-yellow-500"
  },
  {
    text: "The market is a device for transferring money from the impatient to the patient.",
    icon: Trophy,
    color: "text-purple-500"
  },
  {
    text: "Don't focus on making money; focus on protecting what you have.",
    icon: Lightbulb,
    color: "text-orange-500"
  },
  {
    text: "The trend is your friend until the end when it bends.",
    icon: TrendingUp,
    color: "text-cyan-500"
  }
];

export default function MotivationalBar() {
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const quote = quotes[currentQuote];
  const Icon = quote.icon;

  return (
    <Card className="glow-card border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
      <div className="p-4 flex items-center gap-3">
        <div className={`${quote.color} bg-background rounded-full p-2`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground animate-fade-in">
            {quote.text}
          </p>
        </div>
      </div>
    </Card>
  );
}
