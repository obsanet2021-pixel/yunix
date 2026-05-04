import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, LineChart } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const features = {
  free: [
    "Dashboard access",
    "Basic trade journal",
    "Economic calendar",
    "Course library",
    "Text-based AI chat"
  ],
  starter: [
    "Advanced analytics dashboard",
    "AI screenshot analysis",
    "Strategy backtesting",
    "Smart trade tagging",
    "Up to 5 accounts"
  ],
  pro: [
    "Unlimited backtesting",
    "AI trade insights & feedback",
    "Multi-account tracking",
    "Priority support",
    "Early access to features"
  ]
};

const valueProps = [
  {
    title: "Data-driven insights",
    description: "Stop guessing. See exactly what's working and what's not with advanced analytics.",
    gradient: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/20",
    hoverBorder: "hover:border-blue-500/40"
  },
  {
    title: "Save hours weekly",
    description: "AI-powered automation handles the tedious work so you focus on trading.",
    gradient: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/20",
    hoverBorder: "hover:border-purple-500/40"
  },
  {
    title: "Proven performance",
    description: "Join thousands of traders improving consistency and hitting funded goals.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/40"
  }
];

const faqs = [
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Absolutely. Switch plans whenever you want. We'll prorate charges instantly—no waiting periods, no penalties."
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your complete trade history stays safe for 12 months. Come back anytime and pick up exactly where you left off."
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes. Try any paid plan risk-free for 14 days. Not seeing results? We'll refund you immediately, no questions asked."
  },
  {
    question: "Which plan is right for me?",
    answer: "Start Free to learn the basics. Upgrade to Starter when you're tracking 20+ trades monthly. Choose Pro when managing multiple accounts or pursuing funding."
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const prices = {
    starter: isYearly ? 10 : 13,
    pro: isYearly ? 16 : 20
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(168,85,247,0.04),transparent)] dark:bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent)] rounded-full blur-[60px] pointer-events-none" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/yunix logo.png" alt="Yunix" className="h-9 w-9 object-contain rounded-lg" />
              <span className="text-xl font-bold text-foreground">YUNIX</span>
            </Link>
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-indigo-500/20 px-5 py-2 rounded-full mb-8">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-sm font-medium tracking-wide">
              PRICING
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-medium text-foreground mb-6 tracking-tight">
            Built for traders.<br />
            <span className="text-foreground">Priced for growth.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Start with the essentials. Scale with advanced analytics.<br />
            Dominate with professional tools.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-muted/60 dark:bg-slate-900/60 p-1 rounded-full border border-border/50 backdrop-blur-sm relative">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-7 py-2.5 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? "bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-7 py-2.5 rounded-full text-sm font-medium transition-all ${
                isYearly
                  ? "bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
            </button>
            <div className="absolute -right-20 top-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg shadow-emerald-500/30">
              SAVE 20%
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-24">
          {/* Free Plan */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-3xl p-8 backdrop-blur-sm hover:border-indigo-500/30 transition-all hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />
              <h3 className="text-lg font-medium text-muted-foreground tracking-wide">FREE</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-foreground tracking-tight">$0</span>
              </div>
              <p className="text-muted-foreground text-sm mt-2">Forever free</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Perfect for learning the fundamentals and tracking your first trades.
            </p>

            <div className="border-t border-border/50 pt-8 mb-8">
              <ul className="space-y-4">
                {features.free.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-foreground/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Start free
            </Button>
          </div>

          {/* Starter Plan - Featured */}
          <div className="bg-gradient-to-br from-card/80 to-muted/60 border-2 border-indigo-500/50 rounded-3xl p-8 backdrop-blur-xl relative lg:scale-105 shadow-2xl shadow-blue-500/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 rounded-full text-xs font-semibold text-white shadow-lg shadow-blue-500/40">
              RECOMMENDED
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/60" />
              <h3 className="text-lg font-medium text-foreground tracking-wide">STARTER</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-foreground tracking-tight">${prices.starter}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground text-sm mt-2">{isYearly ? "Billed annually" : "Billed monthly"}</p>
            </div>

            <p className="text-foreground/80 mb-8">
              For serious traders ready to analyze performance and improve consistency.
            </p>

            <div className="border-t border-indigo-500/20 pt-8 mb-8">
              <p className="text-muted-foreground text-xs font-medium mb-4 tracking-wide">EVERYTHING IN FREE, PLUS</p>
              <ul className="space-y-4">
                {features.starter.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <span className="text-foreground text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full"
              disabled
            >
              Coming soon
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-3xl p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 shadow-lg shadow-purple-500/40" />
              <h3 className="text-lg font-medium text-foreground tracking-wide">PRO</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-foreground tracking-tight">${prices.pro}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground text-sm mt-2">{isYearly ? "Billed annually" : "Billed monthly"}</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Built for funded traders and portfolio managers who demand the best.
            </p>

            <div className="border-t border-border/50 pt-8 mb-8">
              <p className="text-muted-foreground text-xs font-medium mb-4 tracking-wide">EVERYTHING IN STARTER, PLUS</p>
              <ul className="space-y-4">
                {features.pro.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                    </div>
                    <span className="text-foreground/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              Coming soon
            </Button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-24">
          {["No hidden fees", "Cancel anytime", "14-day money back"].map((badge) => (
            <div key={badge} className="flex items-center gap-2.5 bg-muted/40 border border-border/50 px-5 py-3 rounded-full backdrop-blur-sm">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-emerald-500" />
              </div>
              <span className="text-muted-foreground text-sm">{badge}</span>
            </div>
          ))}
        </div>

        {/* Value props */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              Why traders choose us
            </h2>
            <p className="text-muted-foreground">
              Professional tools that actually make you better
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {valueProps.map((prop) => (
              <div
                key={prop.title}
                className={`bg-gradient-to-br ${prop.gradient} ${prop.borderColor} ${prop.hoverBorder} border rounded-2xl p-8 text-center transition-all hover:-translate-y-1`}
              >
                <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <LineChart className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-3">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-muted/60 to-muted/40 border border-border/50 rounded-3xl p-8 backdrop-blur-xl">
            <h2 className="text-2xl font-medium text-foreground text-center mb-10 tracking-tight">
              Common questions
            </h2>

            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className={index < faqs.length - 1 ? "border-b border-border/50 pb-8" : ""}>
                  <h3 className="text-base font-medium text-foreground mb-3">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
