import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Share2, Copy, RefreshCw, TrendingUp, Users, Clock, Gift, 
  Zap, Target, Flame, ArrowUp, ChevronRight, Sparkles, Crown, Rocket
} from 'lucide-react';

interface ContestEntry {
  rank: number;
  user_id: string;
  username: string;
  points: number;
  bonus_points: number;
  total_points: number;
}

interface UserStats {
  total_invites: number;
  verified_signups: number;
  active_traders: number;
  current_points: number;
  current_rank: number;
  invite_code: string;
}

// Particle component for background animation
function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-primary animate-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDuration: '20s',
        animationDelay: `${delay}s`,
        opacity: Math.random() * 0.5 + 0.25,
      }}
    />
  );
}

// Animated number counter
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const start = count;
      const end = value;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setCount(Math.floor(start + (end - start) * progress));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
      prevValue.current = value;
    }
  }, [value, count]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function InvitationContest() {
  const navigate = useNavigate();
  const { isEnabled, loading: togglesLoading } = useFeatureToggles();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate particles for background
    const generatedParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }));
    setParticles(generatedParticles);
  }, []);

  useEffect(() => {
    if (togglesLoading) return;

    if (!isEnabled('invitation_contest')) {
      navigate('/app/dashboard');
      return;
    }
    loadUserData();
    loadData();
    startCountdown();
  }, [isEnabled, navigate, togglesLoading]);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadData = async () => {
    try {
      const { data: leaderboard } = await supabase
        .from('invitation_contest_leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50);

      if (leaderboard) {
        const formattedEntries = leaderboard.map((entry, index) => ({
          rank: index + 1,
          user_id: entry.user_id,
          username: entry.username || 'Anonymous',
          points: entry.points || 0,
          bonus_points: entry.bonus_points || 0,
          total_points: entry.total_points || 0,
        }));
        setEntries(formattedEntries);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: stats } = await supabase
          .from('invitation_contest_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (stats) {
          setUserStats(stats);
        }
      }
    } catch (error) {
      console.error('Error loading contest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startCountdown = () => {
    const endDate = new Date('2026-05-01T23:59:59');

    const timer = setInterval(() => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(timer);
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  };

  const copyInviteLink = () => {
    if (userStats?.invite_code) {
      const link = `https://yunixofficial.com/invite/${userStats.invite_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToTwitter = () => {
    if (userStats?.invite_code) {
      const text = encodeURIComponent('🏆 Just joined YUNIX Invitation Contest – Round 1!\n\nInvite traders → Climb the leaderboard → Win prizes.\n\n1st: 90% OFF Funded Plaque\n2nd & 3rd: FREE 5k Evaluation\n\nJoin me: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    }
  };

  const shareToTelegram = () => {
    if (userStats?.invite_code) {
      const text = encodeURIComponent('🏆 YUNIX Invitation Contest is LIVE!\n\nTop 3 traders win premium prizes. Invite traders, earn points, climb the leaderboard.\n\nMy link: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://t.me/share/url?url=${encodeURIComponent('https://yunixofficial.com/invite/' + userStats.invite_code)}&text=${text}`, '_blank');
    }
  };

  const shareToWhatsApp = () => {
    if (userStats?.invite_code) {
      const text = encodeURIComponent('🏆 Trading Challenge Alert!\n\nYUNIX Invitation Contest – Invite friends, win prizes.\n\n🥇 1st: 90% OFF Funded Plaque\n🥈🥉 2nd & 3rd: FREE 5k Evaluation\n\nJoin me: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const pointsTo3rd = entries[2]?.total_points ? Math.max(0, entries[2].total_points - (userStats?.current_points || 0) + 1) : 0;
  const progressTo3rd = userStats ? Math.min((userStats.current_points / (entries[2]?.total_points || 1)) * 100, 100) : 0;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none">
        {particles.map(particle => (
          <Particle key={particle.id} x={particle.x} y={particle.y} delay={particle.delay} />
        ))}
      </div>

      {/* Gradient orbs - using Yunix primary color */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-40 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse delay-500" />

      <div className="relative z-10 space-y-8 max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="animate-fade-up">
          <Card className="glass-card border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
            <CardContent className="relative p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center mb-6 gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                <Flame className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary-foreground">Live Now – 15 Days</span>
              </div>

              <h1 className="text-5xl sm:text-7xl font-black mb-3 gradient-text">
                YUNIX Invitation Contest
              </h1>
              <p className="text-xl text-primary mb-2 font-semibold">Round 1: Invite. Climb. Win.</p>
              <p className="text-muted-foreground mb-8 text-lg">3 winners. Real prizes. No limits.</p>

              {/* Countdown Timer */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8 sm:gap-4">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                  {[
                    { value: timeRemaining.days, label: 'Days' },
                    { value: timeRemaining.hours, label: 'Hours' },
                    { value: timeRemaining.minutes, label: 'Minutes' },
                    { value: timeRemaining.seconds, label: 'Seconds' },
                  ].map(item => (
                    <div key={item.label} className="glass-card px-3 sm:px-4 py-2 rounded-lg border border-primary/20">
                      <div className="text-lg sm:text-2xl font-bold text-primary font-mono">
                        <AnimatedNumber value={item.value} />
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Stats */}
              {userStats && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mb-10">
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-black text-primary mb-1">
                      <AnimatedNumber value={userStats.current_points} />
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Your Score</div>
                  </div>
                  <div className="hidden sm:block w-px h-12 bg-primary/20" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      <div className="text-4xl sm:text-5xl font-black text-yellow-400">
                        #{userStats.current_rank}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Rank</div>
                  </div>
                </div>
              )}

              {/* Primary CTA */}
              <Button
                size="lg"
                onClick={copyInviteLink}
                className="btn-gradient text-primary-foreground font-bold text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all mb-4"
              >
                <Share2 className="mr-2 h-5 w-5" />
                Get My Invite Link
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>

              {copied && (
                <div className="inline-block mt-4 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium">
                  ✓ Link copied to clipboard!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prizes Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-fade-up delay-200">
          {[
            {
              icon: '🥇',
              rank: '1st Place',
              prize: 'Funded Plaque',
              discount: '90% OFF',
              value: '$99',
              accent: 'from-yellow-500 to-orange-500',
            },
            {
              icon: '🥈',
              rank: '2nd Place',
              prize: '5k Evaluation',
              discount: 'FREE Entry',
              value: '$99–$149',
              accent: 'from-gray-400 to-slate-400',
            },
            {
              icon: '🥉',
              rank: '3rd Place',
              prize: '5k Evaluation',
              discount: 'FREE Entry',
              value: '$99–$149',
              accent: 'from-orange-400 to-amber-400',
            },
          ].map((item, idx) => (
            <Card key={idx} className="glass-card hover-lift border-0 group">
              <CardContent className="p-6 sm:p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="relative">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.rank}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.prize}</p>
                  <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${item.accent} border border-white/20 mb-3`}>
                    <p className={`text-lg font-bold bg-gradient-to-r ${item.accent} bg-clip-text text-transparent`}>
                      {item.discount}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Valued at {item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Your Progress Section */}
        {userStats && (
          <div className="animate-fade-up delay-300">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invite Link */}
                <div className="p-4 rounded-xl glass-card border border-primary/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Your Invite Link</p>
                  <div className="flex gap-2 items-stretch">
                    <code className="flex-1 px-4 py-3 rounded-lg bg-card text-primary text-sm font-mono overflow-x-auto">
                      yunixofficial.com/invite/{userStats.invite_code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      className="border-primary/30 hover:bg-primary/20 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { icon: Share2, label: 'Total Invites', value: userStats.total_invites, colorClass: 'text-primary', borderClass: 'border-primary/20' },
                    { icon: Users, label: 'Verified Signups', value: userStats.verified_signups, colorClass: 'text-blue-500', borderClass: 'border-blue-500/20' },
                    { icon: Zap, label: 'Active Traders', value: userStats.active_traders, colorClass: 'text-green-500', borderClass: 'border-green-500/20' },
                    { icon: Trophy, label: 'Points', value: userStats.current_points, colorClass: 'text-primary', borderClass: 'border-primary/20' },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl glass-card border ${stat.borderClass} text-center group cursor-pointer hover-lift`}
                    >
                      <stat.icon className={`h-5 w-5 ${stat.colorClass} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                      <div className={`text-2xl sm:text-3xl font-black ${stat.colorClass} mb-1`}>
                        <AnimatedNumber value={stat.value} />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress to 3rd */}
                {pointsTo3rd > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="h-4 w-4 text-yellow-400" />
                      <p className="text-sm font-semibold text-yellow-300">
                        Need <span className="font-black">{pointsTo3rd}</span> more points to reach #3
                      </p>
                    </div>
                    <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-1000 rounded-full"
                        style={{ width: `${progressTo3rd}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboard Section */}
        <div className="animate-fade-up delay-400">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Live Leaderboard
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border-primary/30 hover:bg-primary/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">Rank</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">User</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground text-xs uppercase">Points</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground text-xs uppercase">Bonus</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground text-xs uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 20).map(entry => (
                      <tr
                        key={entry.user_id}
                        className={`transition-all border-b border-border/50 hover:bg-primary/5 ${
                          entry.user_id === user?.id ? 'bg-primary/10' : ''
                        }`}
                        style={entry.user_id === user?.id ? { borderLeft: '4px solid #f97316' } : undefined}
                      >
                        <td className="p-3 text-lg font-black">{getRankIcon(entry.rank)}</td>
                        <td className="p-3 font-medium text-foreground">
                          {entry.user_id === user?.id ? (
                            <span className="inline-flex items-center gap-2">
                              {entry.username}
                              <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary text-xs">
                                You
                              </Badge>
                            </span>
                          ) : (
                            entry.username
                          )}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{entry.points}</td>
                        <td className="p-3 text-right text-green-400 font-semibold">+{entry.bonus_points}</td>
                        <td className="p-3 text-right text-foreground font-bold">
                          <AnimatedNumber value={entry.total_points} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How Scoring Works */}
        <div className="animate-fade-up delay-500">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Target className="h-5 w-5 text-primary" />
                Scoring System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                <p className="text-sm font-semibold text-primary">📊 Your Score Formula</p>
                <div className="space-y-2 text-sm text-foreground">
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold">1 pt</span>
                    <span>per invited signup</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">+2 pts</span>
                    <span>if they log 5+ trades within 7 days</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm font-semibold text-primary mb-3">Example:</p>
                <div className="space-y-2 text-sm text-foreground">
                  <p>You invite 10 people → 10 points</p>
                  <p>3 of them trade actively → +6 bonus</p>
                  <p className="font-bold text-primary">Your total = 16 points</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">💡 Quality beats quantity. Focus on real traders.</p>
            </CardContent>
          </Card>
        </div>

        {/* Share Section */}
        <div className="animate-fade-up delay-500">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Share2 className="h-5 w-5 text-primary" />
                Share Your Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={shareToTwitter}
                  className="btn-gradient text-primary-foreground font-semibold py-5"
                >
                  <span className="text-xl mr-2">𝕏</span> Share on Twitter
                </Button>
                <Button
                  onClick={shareToTelegram}
                  className="btn-gradient text-primary-foreground font-semibold py-5"
                >
                  <span className="text-xl mr-2">✈️</span> Share on Telegram
                </Button>
                <Button
                  onClick={shareToWhatsApp}
                  className="btn-gradient text-primary-foreground font-semibold py-5"
                >
                  <span className="text-xl mr-2">📱</span> Share on WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-3 py-8 animate-fade-up delay-500">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 text-sm"
              onClick={() => navigate('/contest-rules')}
            >
              📋 Full Rules
            </Button>
            <span className="hidden sm:inline">•</span>
            <span>Prizes by YUNIX & Partner Firms</span>
            <span className="hidden sm:inline">•</span>
            <span>No Purchase Necessary</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 YUNIX Trading. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
