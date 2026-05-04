import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    starter: isYearly ? 12 : 15,
    pro: isYearly ? 31 : 39
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent)] rounded-full blur-[60px] pointer-events-none" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <LineChart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-white">YUNIX</span>
            </div>
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-white/70 hover:text-white">
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

          <h1 className="text-5xl sm:text-6xl font-medium text-white mb-6 tracking-tight">
            Built for traders.<br />
            <span className="text-white">Priced for growth.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Start with the essentials. Scale with advanced analytics.<br />
            Dominate with professional tools.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-slate-900/60 p-1 rounded-full border border-white/10 backdrop-blur-sm relative">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-7 py-2.5 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-7 py-2.5 rounded-full text-sm font-medium transition-all ${
                isYearly
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-slate-500 hover:text-slate-300"
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
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:border-indigo-500/30 transition-all hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-slate-500/60" />
              <h3 className="text-lg font-medium text-slate-300 tracking-wide">FREE</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-white tracking-tight">$0</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">Forever free</p>
            </div>

            <p className="text-slate-400 mb-8">
              Perfect for learning the fundamentals and tracking your first trades.
            </p>

            <div className="border-t border-white/10 pt-8 mb-8">
              <ul className="space-y-4">
                {features.free.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-300"
              onClick={() => navigate("/auth")}
            >
              Start free
            </Button>
          </div>

          {/* Starter Plan - Featured */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-2 border-indigo-500/50 rounded-3xl p-8 backdrop-blur-xl relative lg:scale-105 shadow-2xl shadow-blue-500/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 rounded-full text-xs font-semibold text-white shadow-lg shadow-blue-500/40">
              RECOMMENDED
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/60" />
              <h3 className="text-lg font-medium text-white tracking-wide">STARTER</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-white tracking-tight">${prices.starter}</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">{isYearly ? "Billed annually" : "Billed monthly"}</p>
            </div>

            <p className="text-slate-300 mb-8">
              For serious traders ready to analyze performance and improve consistency.
            </p>

            <div className="border-t border-indigo-500/20 pt-8 mb-8">
              <p className="text-slate-500 text-xs font-medium mb-4 tracking-wide">EVERYTHING IN FREE, PLUS</p>
              <ul className="space-y-4">
                {features.starter.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-indigo-400" />
                    </div>
                    <span className="text-slate-200 text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-90 shadow-lg shadow-blue-500/30"
              onClick={() => navigate("/auth")}
            >
              Start 14-day trial
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 shadow-lg shadow-purple-500/40" />
              <h3 className="text-lg font-medium text-white tracking-wide">PRO</h3>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-medium text-white tracking-tight">${prices.pro}</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">{isYearly ? "Billed annually" : "Billed monthly"}</p>
            </div>

            <p className="text-slate-400 mb-8">
              Built for funded traders and portfolio managers who demand the best.
            </p>

            <div className="border-t border-white/10 pt-8 mb-8">
              <p className="text-slate-500 text-xs font-medium mb-4 tracking-wide">EVERYTHING IN STARTER, PLUS</p>
              <ul className="space-y-4">
                {features.pro.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-purple-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
              onClick={() => navigate("/auth")}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-24">
          {["No hidden fees", "Cancel anytime", "14-day money back"].map((badge) => (
            <div key={badge} className="flex items-center gap-2.5 bg-slate-900/40 border border-white/10 px-5 py-3 rounded-full backdrop-blur-sm">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-emerald-500" />
              </div>
              <span className="text-slate-400 text-sm">{badge}</span>
            </div>
          ))}
        </div>

        {/* Value props */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium text-white mb-3 tracking-tight">
              Why traders choose us
            </h2>
            <p className="text-slate-400">
              Professional tools that actually make you better
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {valueProps.map((prop) => (
              <div
                key={prop.title}
                className={`bg-gradient-to-br ${prop.gradient} ${prop.borderColor} ${prop.hoverBorder} border rounded-2xl p-8 text-center transition-all hover:-translate-y-1`}
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <LineChart className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-3">{prop.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <h2 className="text-2xl font-medium text-white text-center mb-10 tracking-tight">
              Common questions
            </h2>

            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className={index < faqs.length - 1 ? "border-b border-white/10 pb-8" : ""}>
                  <h3 className="text-base font-medium text-white mb-3">{faq.question}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
