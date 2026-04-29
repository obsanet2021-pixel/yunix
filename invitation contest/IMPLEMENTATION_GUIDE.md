# YUNIX Invitation Contest - Implementation Guide

## 🎯 Overview

This is a **premium, highly interactive** invitation contest page with:
- ✨ Glassmorphism + gradient design
- 🎬 Smooth animations & micro-interactions
- 📊 Animated number counters
- 🔔 Real-time leaderboard
- 📱 Fully responsive mobile-first design
- ⚡ Particle background effects
- 🎨 Gradient text & UI elements

## 📦 Installation

### 1. **Replace the existing component**
```bash
# Copy the new InvitationContest.tsx to your components folder
cp InvitationContest.tsx src/pages/InvitationContest.tsx
```

### 2. **Ensure dependencies are installed**
```bash
npm install
```

**Required packages:**
- `react` (already installed)
- `react-router-dom` (already installed)
- `@supabase/supabase-js` (already installed)
- `lucide-react` (already installed)
- Custom UI components (already in your project)

No new packages needed! ✅

## 🎨 Key Features

### Animations & Effects
1. **Particle Background** - 50 animated floating particles
2. **Glassmorphism Cards** - Semi-transparent cards with backdrop blur
3. **Shimmer Effect** - Gradient text animation on hero
4. **Slide-up Animation** - Staggered section reveals
5. **Hover Effects** - Smooth transitions on interactive elements
6. **Animated Counters** - Smooth number transitions
7. **Glow Pulses** - Subtle glowing effects on stats

### Responsive Design
- **Mobile First**: Optimized for small screens
- **Tablet**: Improved spacing & layout
- **Desktop**: Full-featured experience
- Sidebar-aware padding (uses existing `lg:` breakpoints)

### Components Used

#### AnimatedNumber
Animates number changes smoothly (for stats, points, etc.)
```tsx
<AnimatedNumber value={userStats.current_points} />
```

#### Particle
Renders floating animated particles in background
```tsx
<Particle x={50} y={50} delay={1} />
```

## 🔧 Configuration

### Contest End Date
Edit line ~179 in the component:
```tsx
const endDate = new Date('2026-05-01T23:59:59');
// Change to your actual end date
```

### Share Messages
Customize the share text (lines 240-265):
```tsx
const shareToTwitter = () => {
  // Edit the text variable for custom messages
};
```

### Colors & Theme
Colors are defined via Tailwind classes:
- **Primary**: `purple-500`, `purple-400`
- **Secondary**: `pink-500`, `pink-400`
- **Success**: `green-400`
- **Warning**: `yellow-400`, `orange-400`

To customize, search for color classes and replace globally.

## 📊 Database Requirements

Make sure these tables exist in Supabase:

### `invitation_contest_leaderboard`
```sql
CREATE TABLE invitation_contest_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT,
  points INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_leaderboard_total_points ON invitation_contest_leaderboard(total_points DESC);
```

### `invitation_contest_stats`
```sql
CREATE TABLE invitation_contest_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  total_invites INTEGER DEFAULT 0,
  verified_signups INTEGER DEFAULT 0,
  active_traders INTEGER DEFAULT 0,
  current_points INTEGER DEFAULT 0,
  current_rank INTEGER DEFAULT 0,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_contest_stats_user ON invitation_contest_stats(user_id);
CREATE INDEX idx_contest_stats_code ON invitation_contest_stats(invite_code);
```

## 🎯 Feature Toggle

The page checks for the `invitation_contest` feature toggle:

```tsx
if (!isEnabled('invitation_contest')) {
  navigate('/app/dashboard');
}
```

Enable it in your feature toggles system or remove this check.

## 🚀 Performance Tips

1. **Particle Count** - Reduce from 50 to 30 on mobile for better performance
2. **Animations** - All CSS-based (GPU accelerated) for smooth 60fps
3. **Images** - No images used, pure CSS & SVG
4. **Bundle Size** - No new dependencies added

## 📱 Mobile Optimizations

- Stack layout on small screens
- Touch-friendly button sizing (py-5, px-8)
- Readable font sizes (text-base up to text-7xl)
- Proper padding for mobile bottom nav (pb-24)
- Horizontal scroll for leaderboard on mobile

## 🎬 Animation Classes

Key CSS animations defined in the component:

- `float` - Particle floating effect (20s loop)
- `shimmer` - Gradient text shimmer (3s loop)
- `slide-up` - Section reveal animation
- `glow-pulse` - Glow intensity pulse
- `rotate-slow` - Slow rotation effect

## 🔒 Security Notes

1. ✅ **User verification** via `supabase.auth.getUser()`
2. ✅ **RLS policies** should protect database tables
3. ✅ **Invite codes** should be validated on backend
4. ✅ **Points calculation** should be server-side

Add RLS policies to prevent direct database manipulation:

```sql
-- Users can only see contest data
CREATE POLICY "Users can view leaderboard"
  ON invitation_contest_leaderboard
  FOR SELECT
  USING (true);

-- Users can only update their own stats
CREATE POLICY "Users can update own stats"
  ON invitation_contest_stats
  FOR UPDATE
  USING (auth.uid() = user_id);
```

## 🎨 Customization Ideas

### 1. **Change Color Scheme**
Replace purple/pink with your brand colors:
- `from-purple-500 to-pink-500` → `from-blue-500 to-cyan-500`
- `text-purple-400` → `text-blue-400`

### 2. **Add Your Logo**
Import and add logo to hero section:
```tsx
<img src="/yunix-logo.png" alt="YUNIX" className="h-12 mb-4" />
```

### 3. **Custom Particles**
Modify particle generation (~42 lines):
```tsx
const generatedParticles = Array.from({ length: 100 }, ...); // More particles
```

### 4. **Add Sound Effects**
Play sounds on actions:
```tsx
const playSound = () => {
  const audio = new Audio('/sounds/success.mp3');
  audio.play();
};
```

### 5. **Confetti on Win**
Add confetti when user reaches top 3:
```tsx
if (userStats?.current_rank <= 3) {
  // Import confetti library and trigger
}
```

## 🐛 Troubleshooting

### Animations not smooth
- Check if GPU acceleration is enabled
- Reduce particle count
- Use Chrome DevTools Performance tab

### Numbers not animating
- Ensure `useRef` and `useEffect` are properly imported
- Check browser DevTools console for errors

### Leaderboard not updating
- Verify Supabase connection
- Check RLS policies
- Ensure `loadData()` is called after updates

### Mobile layout broken
- Check responsive breakpoints (sm:, md:, lg:)
- Test in mobile DevTools
- Verify Tailwind classes are available

## 📈 Future Enhancements

1. **Real-time updates** - Add Supabase realtime subscriptions
2. **Achievements** - Unlock badges for milestones
3. **Leaderboard animations** - Animate rank changes
4. **Notifications** - Push notifications for rank changes
5. **Export** - Download leaderboard as CSV
6. **Referral tracking** - Show invite performance analytics
7. **Historical data** - Past contest results

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check React & Tailwind docs
4. Test in incognito mode (cache issues)

## 📄 License

This component is part of the YUNIX platform. Modify freely for internal use.

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅
