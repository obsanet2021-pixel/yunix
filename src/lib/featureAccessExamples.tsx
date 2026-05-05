/**
 * FEATURE ACCESS SYSTEM - USAGE EXAMPLES
 *
 * This file demonstrates how to use the new feature access system
 * throughout the Yunix application.
 */

// ==================== BASIC USAGE ====================

import {
  useFeatureAccess,
  FeatureKey,
  FEATURES,
  canAccess,
  getLockReason,
  getUpgradeCTA,
} from '@/config/features';
import {
  FeatureGate,
  UpgradePrompt,
  LockedFeature,
  PlanBadge,
} from '@/components/features';

// -------------------- Example 1: Simple Feature Gate --------------------
// Wrap any feature with FeatureGate - it handles access checking automatically

function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>

      {/* Free users see this */}
      <FeatureGate feature="analytics">
        <BasicAnalytics />
      </FeatureGate>

      {/* Starter/Pro only - shows upgrade prompt for free users */}
      <FeatureGate feature="analytics_screenshot">
        <ScreenshotSharing />
      </FeatureGate>

      {/* Pro only - MT5 connection */}
      <FeatureGate feature="mt5_connection">
        <MT5Connector />
      </FeatureGate>
    </div>
  );
}

// -------------------- Example 2: Manual Access Check --------------------
// Use the hook directly when you need more control

function BacktestingCardManual() {
  const { canAccess, upgradeCTA } = useFeatureAccess();

  // Check if user has access
  if (!canAccess('backtesting')) {
    return (
      <div className="p-4 border rounded-lg">
        <p>Backtesting is locked 🔒</p>
        <p className="text-sm text-muted-foreground">{upgradeCTA('backtesting')}</p>
      </div>
    );
  }

  return <BacktestingTool />;
}

// -------------------- Example 3: Custom Fallback --------------------
// Provide your own fallback UI

function LoyaltySection() {
  return (
    <FeatureGate
      feature="loyalty_program"
      fallback={
        <div className="text-center p-8">
          <p>Loyalty program is coming soon!</p>
        </div>
      }
    >
      <LoyaltyDashboard />
    </FeatureGate>
  );
}

// -------------------- Example 4: Hidden vs Visible Locked --------------------
// Some features are hidden from free users (loyalty), others are visible (backtesting)

function FeaturesList() {
  const { isVisible } = useFeatureAccess();

  return (
    <div>
      {/* Always visible - shows upgrade prompt when locked */}
      {isVisible('backtesting') && (
        <FeatureGate feature="backtesting">
          <BacktestingTool />
        </FeatureGate>
      )}

      {/* Hidden from free users - only shows if they have access */}
      {isVisible('loyalty_program') && (
        <FeatureGate feature="loyalty_program">
          <LoyaltyCard />
        </FeatureGate>
      )}
    </div>
  );
}

// -------------------- Example 5: Plan Badge --------------------
// Show which plan is required

function FeatureCard({ featureKey }: { featureKey: FeatureKey }) {
  const feature = FEATURES[featureKey];
  const { canAccess } = useFeatureAccess();
  const hasAccess = canAccess(featureKey);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3>{feature.name}</h3>
        {!hasAccess && <PlanBadge plan={feature.plans[0]} />}
      </div>
      <p className="text-sm text-muted-foreground">{feature.description}</p>
    </div>
  );
}

// -------------------- Example 6: Certificate System --------------------
// Free can view, Starter/Pro can print

function CertificateGallery() {
  return (
    <div>
      <h1>My Certificates</h1>

      {/* View - available to all */}
      <FeatureGate feature="certificate_view">
        <CertificateList />
      </FeatureGate>

      {/* Print - Starter/Pro only */}
      <FeatureGate feature="certificate_print">
        <PrintButton />
      </FeatureGate>

      {/* Size guide - Starter/Pro only, toggleable */}
      <FeatureGate feature="certificate_size_guide">
        <SizeGuide />
      </FeatureGate>
    </div>
  );
}

// -------------------- Example 7: AI Assistant with Image Upload --------------------
// Free gets text AI, Starter/Pro gets image upload

function AIChat() {
  return (
    <div>
      <FeatureGate feature="text_ai">
        <ChatInterface />
      </FeatureGate>

      {/* Only show image upload for Starter/Pro */}
      <FeatureGate feature="image_upload">
        <ImageUploadButton />
      </FeatureGate>

      {/* Free users see upgrade prompt for image upload */}
      <FeatureGate feature="image_upload" showUpgradePrompt={true}>
        <></> {/* Empty - just want the prompt */}
      </FeatureGate>
    </div>
  );
}

// -------------------- Example 8: Staff/CEO Bypass --------------------
// Staff and CEO always see everything unlocked

function AdminOnlyFeature() {
  const { userRole } = useFeatureAccess();

  // Alternative: Check role directly
  if (userRole === 'ceo' || userRole === 'staff') {
    return <AdminTools />;
  }

  return <UserView />;
}

// -------------------- Example 9: Navigation with Feature Gates --------------------
// Show/hide nav items based on access

function Navigation() {
  const { canAccess } = useFeatureAccess();

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', feature: 'dashboard' as FeatureKey },
    { label: 'Backtesting', path: '/app/backtest', feature: 'backtesting' as FeatureKey },
    { label: 'Loyalty', path: '/app/loyalty', feature: 'loyalty_program' as FeatureKey },
    { label: 'Partners', path: '/app/partners', feature: 'partner_program' as FeatureKey },
  ];

  return (
    <nav>
      {navItems.map((item) =>
        canAccess(item.feature) ? (
          <a key={item.path} href={item.path}>
            {item.label}
          </a>
        ) : null
      )}
    </nav>
  );
}

// -------------------- Example 10: Server-side/Edge Function Check --------------------
// Use the core functions for server-side checks

// In an Edge Function:
async function handleRequest(req: Request) {
  const userPlan = 'starter'; // From JWT or database
  const userRole = 'user'; // From JWT

  // Check if feature is accessible
  const canUseBacktest = canAccess('backtesting', userPlan, userRole);

  if (!canUseBacktest) {
    return new Response(JSON.stringify({ error: 'Feature not available' }), {
      status: 403,
    });
  }

  // Process the request...
}

// -------------------- Example 11: Form with Locked Fields --------------------
// Disable form fields for locked features

function TradingSettingsForm() {
  const { canAccess } = useFeatureAccess();
  const canUseMT5 = canAccess('mt5_connection');

  return (
    <form>
      <div>
        <label>Manual Trading</label>
        <input type="checkbox" defaultChecked />
      </div>

      <div className={!canUseMT5 ? 'opacity-50' : ''}>
        <label>MT5 Auto-Trading</label>
        <input type="checkbox" disabled={!canUseMT5} />
        {!canUseMT5 && (
          <p className="text-sm text-amber-600">
            Upgrade to Pro to enable MT5 connection
          </p>
        )}
      </div>
    </form>
  );
}

// -------------------- Example 12: Loading States --------------------
// FeatureGate handles loading automatically

function AnalyticsDashboard() {
  return (
    <div>
      {/* Shows loading skeleton while checking access */}
      <FeatureGate feature="analytics">
        <AdvancedCharts />
      </FeatureGate>

      {/* Or handle loading manually */}
      <ManualFeatureCheck />
    </div>
  );
}

function ManualFeatureCheck() {
  const { canAccess, isLoading } = useFeatureAccess();

  if (isLoading) {
    return <div>Checking permissions...</div>;
  }

  if (!canAccess('analytics')) {
    return <UpgradePrompt feature="analytics" />;
  }

  return <AdvancedCharts />;
}

// -------------------- Example 13: Batch Access Check --------------------
// Check multiple features at once

function FeatureOverview() {
  const { features } = useFeatureAccess();

  // Get all available features
  const allFeatures = Object.entries(features).map(([key, config]) => ({
    key,
    ...config,
  }));

  return (
    <div>
      {allFeatures.map((feature) => (
        <FeatureGate key={feature.key} feature={feature.key as FeatureKey}>
          <FeatureCard featureKey={feature.key as FeatureKey} />
        </FeatureGate>
      ))}
    </div>
  );
}

// ==================== MIGRATION FROM OLD SYSTEM ====================

// Old way (usePlanFeatures):
// const { hasFeature, plan } = usePlanFeatures();
// if (hasFeature('analytics_screenshot')) { ... }

// New way (useFeatureAccess):
// const { canAccess, currentPlan } = useFeatureAccess();
// if (canAccess('analytics_screenshot')) { ... }

// The old hooks are still exported for backwards compatibility:
// export { usePlanFeatures } from '@/config/features';

// ==================== BEST PRACTICES ====================

/**
 * 1. Always use FeatureGate when possible - it handles loading, error states, and fallbacks
 *
 * 2. For navigation items, use canAccess() to conditionally show/hide
 *
 * 3. For UI elements within a page, use FeatureGate for cleaner code
 *
 * 4. Staff/CEO bypass works automatically - no special handling needed
 *
 * 5. Toggleable features check both plan AND enabled state automatically
 *
 * 6. Use isVisible() to determine if a locked feature should be shown (vs hidden)
 *
 * 7. Provide custom fallbacks for better UX when features are locked
 *
 * 8. Always test both the "has access" and "no access" states
 */

// Placeholder components for examples
function BasicAnalytics() {
  return <div>Basic Analytics</div>;
}
function ScreenshotSharing() {
  return <div>Screenshot Sharing</div>;
}
function MT5Connector() {
  return <div>MT5 Connector</div>;
}
function BacktestingTool() {
  return <div>Backtesting Tool</div>;
}
function LoyaltyDashboard() {
  return <div>Loyalty Dashboard</div>;
}
function LoyaltyCard() {
  return <div>Loyalty Card</div>;
}
function CertificateList() {
  return <div>Certificate List</div>;
}
function PrintButton() {
  return <button>Print</button>;
}
function SizeGuide() {
  return <div>Size Guide</div>;
}
function ChatInterface() {
  return <div>Chat</div>;
}
function ImageUploadButton() {
  return <button>Upload Image</button>;
}
function AdminTools() {
  return <div>Admin Tools</div>;
}
function UserView() {
  return <div>User View</div>;
}
function AdvancedCharts() {
  return <div>Advanced Charts</div>;
}
