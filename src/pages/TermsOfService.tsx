import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: December 20, 2025</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using YUNIX ("the Service"), you accept and agree to be bound by the terms 
              and provisions of this agreement. If you do not agree to abide by these terms, please do not 
              use this service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Use of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. 
              You are responsible for maintaining the confidentiality of your account credentials and for 
              all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access certain features of the Service, you must register for an account. You agree to 
              provide accurate, current, and complete information during the registration process and to 
              update such information to keep it accurate, current, and complete.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Trading Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              YUNIX is a trading journal and analytics platform. We do not provide financial advice. 
              Trading in financial markets involves substantial risk of loss and is not suitable for 
              all investors. Past performance is not indicative of future results.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are and will remain the 
              exclusive property of YUNIX and its licensors. The Service is protected by copyright, 
              trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall YUNIX, nor its directors, employees, partners, agents, suppliers, or 
              affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
              damages, including without limitation, loss of profits, data, use, goodwill, or other 
              intangible losses.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and bar access to the Service immediately, without 
              prior notice or liability, under our sole discretion, for any reason whatsoever, including 
              without limitation if you breach the Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, 
              we will provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our support channels 
              or via Telegram.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
