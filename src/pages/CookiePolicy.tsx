import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LineChart, ArrowLeft, Cookie } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <LineChart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">YUNIX</span>
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
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Cookie className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cookie Policy</h1>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when 
              you visit our website. They help us provide you with a better experience by remembering 
              your preferences and understanding how you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong className="text-foreground">Essential Cookies:</strong> Required for the 
                operation of our platform, including authentication and session management.
              </li>
              <li>
                <strong className="text-foreground">Preference Cookies:</strong> Remember your 
                settings and preferences, such as theme selection (dark/light mode).
              </li>
              <li>
                <strong className="text-foreground">Analytics Cookies:</strong> Help us understand 
                how visitors interact with our platform to improve the user experience.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold text-foreground">Session Cookies</h3>
                <p className="text-sm mt-1">
                  Temporary cookies that are deleted when you close your browser. Used for 
                  authentication and maintaining your session.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold text-foreground">Persistent Cookies</h3>
                <p className="text-sm mt-1">
                  Remain on your device for a set period. Used to remember your preferences 
                  and settings across sessions.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Please note that 
              disabling certain cookies may affect the functionality of our platform. Most browsers 
              allow you to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>View what cookies are stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies from specific websites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{" "}
              <a href="mailto:support@yunix.com" className="text-primary hover:underline">
                support@yunix.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
