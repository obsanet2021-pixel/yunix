# Yunix Feature Access System

A complete feature gating system for Yunix trading platform that combines subscription plans, user roles, and CEO-controlled feature toggles.

## Core Logic

```
function canAccess(feature, user) {
  if (user.role === "ceo" || user.role === "staff") return true

  if (!feature.plans.includes(user.plan)) return false

  if (!feature.toggleable) return true

  return feature.enabled === true
}
```

## Architecture

### 1. Plans (Subscription Tiers)
- **free** - Basic trading features
- **starter** - Backtesting, screenshot sharing, certificate printing
- **pro** - MT5 connection, AI image upload, priority features

### 2. Roles
- **user** - Normal customer (restricted by plan)
- **staff** - Full access to ALL features (bypasses everything)
- **ceo** - Full access + controls feature toggles

### 3. Feature Types

#### Non-Toggleable (Plan-Restricted Only)
- `dashboard`, `trade_management`, `trade_journal`, `analytics`, `accounts`, `economic_calendar` - Available on all plans
- `backtesting` - Starter/Pro only
- `mt5_connection` - Pro only
- `certificate_view` - All plans
- `certificate_print` - Starter/Pro only
- `plug_orders` - Starter/Pro only
- `text_ai` - All plans
- `image_upload` - Starter/Pro only

#### Toggleable (Plan + CEO Toggle)
- `certificate_size_guide` - Starter/Pro only
- `loyalty_program` - Starter/Pro only
- `partner_program` - Starter/Pro only
- `google_signin` - All plans
- `invitation_contest` - All plans

## Files Created/Modified

### Core Configuration
| File | Purpose |
|------|---------|
| `src/config/features.ts` | Complete feature config, access logic, and hooks |
| `src/components/features/index.ts` | Component exports |

### UI Components
| File | Purpose |
|------|---------|
| `src/components/features/FeatureGate.tsx` | Conditional rendering wrapper |
| `src/components/features/UpgradePrompt.tsx` | Beautiful upgrade CTA |
| `src/components/features/LockedFeature.tsx` | Locked state display |
| `src/components/features/PlanBadge.tsx` | Plan requirement badges |

### Admin Dashboard
| File | Purpose |
|------|---------|
| `src/pages/admin/FeatureManagement.tsx` | CEO dashboard for toggling features |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/20260505000001_feature_toggles_update.sql` | Migration for toggle storage |

### Documentation
| File | Purpose |
|------|---------|
| `src/lib/featureAccessExamples.tsx` | 13 usage examples |
| `FEATURE_ACCESS_SYSTEM.md` | This documentation |

## Usage Examples

### Basic Feature Gate
```tsx
import { FeatureGate } from '@/components/features';

<FeatureGate feature="backtesting">
  <BacktestingTool />
</FeatureGate>
```

### Manual Access Check
```tsx
import { useFeatureAccess } from '@/config/features';

function MyComponent() {
  const { canAccess, upgradeCTA } = useFeatureAccess();

  if (!canAccess('backtesting')) {
    return <div>{upgradeCTA('backtesting')}</div>;
  }

  return <BacktestingTool />;
}
```

### Custom Fallback
```tsx
<FeatureGate
  feature="loyalty_program"
  fallback={<div>Coming soon!</div>}
>
  <LoyaltyDashboard />
</FeatureGate>
```

### With Loading State
```tsx
const { canAccess, isLoading } = useFeatureAccess();

if (isLoading) return <Skeleton />;
if (!canAccess('mt5_connection')) return <UpgradePrompt feature="mt5_connection" />;
return <MT5Connector />;
```

### Navigation Filtering
```tsx
const { canAccess } = useFeatureAccess();

const navItems = [
  { label: 'Dashboard', feature: 'dashboard', path: '/app/dashboard' },
  { label: 'Backtesting', feature: 'backtesting', path: '/app/backtest' },
  { label: 'MT5', feature: 'mt5_connection', path: '/app/mt5' },
];

{navItems.map(item =>
  canAccess(item.feature) && <NavLink to={item.path}>{item.label}</NavLink>
)}
```

## Feature Visibility

Features can be either:
- **Visible when locked** - Shows upgrade prompt (backtesting, MT5)
- **Hidden when locked** - Doesn't appear at all (loyalty, partner programs)

Configure in `src/config/features.ts`:
```ts
certificate_size_guide: {
  lockedVisibility: 'visible',  // Show with upgrade prompt
},
loyalty_program: {
  lockedVisibility: 'hidden',     // Hide from free users
}
```

## CEO Feature Management

Access: `/app/admin/feature-management`

Only CEO can:
- View all toggleable features
- Enable/disable features globally
- See which features are available on which plans

## API Reference

### useFeatureAccess Hook
```ts
const {
  canAccess,      // (feature: FeatureKey) => boolean
  isLocked,       // (feature: FeatureKey) => boolean
  getLockReason,  // (feature: FeatureKey) => { type, message, upgradePlan }
  upgradeCTA,     // (feature: FeatureKey) => string
  currentPlan,    // Plan ('free' | 'starter' | 'pro')
  userRole,       // Role ('user' | 'staff' | 'ceo')
  nextPlan,       // Plan | null
  isVisible,      // (feature: FeatureKey) => boolean
  isLoading,      // boolean
  features,       // Record<FeatureKey, FeatureConfig>
  toggles,        // Current toggle states
} = useFeatureAccess();
```

### Core Functions
```ts
import {
  canAccess,          // Check access (feature, plan, role, toggles)
  getLockReason,      // Get why feature is locked
  getUpgradeCTA,      // Get upgrade message
  getAccessibleFeatures,  // List all accessible features
  getVisibleFeatures,     // List all visible features
  getNextPlan,        // Get next plan tier
} from '@/config/features';
```

### Components
```ts
import {
  FeatureGate,        // Conditional rendering wrapper
  UpgradePrompt,      // Upgrade CTA card
  LockedFeature,      // Locked state display
  PlanBadge,          // Plan indicator badge
  FeaturePlanBadge,   // Feature-specific plan badge
} from '@/components/features';
```

## Adding New Features

1. Add to `FEATURES` in `src/config/features.ts`:
```ts
my_new_feature: {
  key: 'my_new_feature',
  name: 'My New Feature',
  description: 'What it does',
  plans: ['starter', 'pro'],
  toggleable: false,  // or true
  lockedVisibility: 'visible',
}
```

2. Use in components:
```tsx
<FeatureGate feature="my_new_feature">
  <NewFeature />
</FeatureGate>
```

3. If toggleable, add to database migration:
```sql
'my_new_feature', COALESCE(current_toggles->>'my_new_feature', 'true')::boolean,
```

## Backwards Compatibility

The old `usePlanFeatures` hook is still exported for existing code:
```ts
// Old way (still works)
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
const { hasFeature } = usePlanFeatures();

// New way (recommended)
import { useFeatureAccess } from '@/config/features';
const { canAccess } = useFeatureAccess();
```

## Security

- Staff/CEO always bypass plan restrictions
- Toggleable features check both plan AND enabled state
- Database stores toggle states in `system_settings.feature_toggles`
- Server-side checks should use `is_feature_enabled()` SQL function

## Upgrade Drivers

Features that drive upgrades:
- **Free → Starter**: Backtesting, Screenshot sharing, Certificate printing, AI image upload
- **Starter → Pro**: MT5 connection
