import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Share2, Copy, RefreshCw, TrendingUp, Users, Clock, Gift } from 'lucide-react';

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

export default function InvitationContest() {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureToggles();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isEnabled('invitation_contest')) {
      navigate('/app/dashboard');
      return;
    }
    loadUserData();
    loadData();
    startCountdown();
  }, [isEnabled, navigate]);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadData = async () => {
    try {
      // Load leaderboard entries
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

      // Load user stats
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

  const startCountdown = () => {
    // Contest end date - set this to your actual end date
    const endDate = new Date('2026-05-01T23:59:59'); // Example: May 1st, 2026

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
      const text = encodeURIComponent('Just joined the YUNIX contest. Invite traders, win prizes. Join me: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    }
  };

  const shareToTelegram = () => {
    if (userStats?.invite_code) {
      const text = encodeURIComponent('YUNIX contest is live. Top 3 win prizes. Here\'s my invite: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://t.me/share/url?url=${encodeURIComponent('https://yunixofficial.com/invite/' + userStats.invite_code)}&text=${text}`, '_blank');
    }
  };

  const shareToWhatsApp = () => {
    if (userStats?.invite_code) {
      const text = encodeURIComponent('Trading challenge. Invite friends to YUNIX. My link: https://yunixofficial.com/invite/' + userStats.invite_code);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
        <CardContent className="p-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            🏆 YUNIX Invitation Contest – Round 1
          </h1>
          <p className="text-xl text-muted-foreground mb-4">Invite. Climb. Win.</p>
          <p className="text-lg mb-6">15 days. 3 winners. Real prizes.</p>
          
          {/* Countdown Timer */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Clock className="h-5 w-5 text-purple-400" />
            <div className="flex gap-2">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {timeRemaining.days}d
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {timeRemaining.hours}h
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {timeRemaining.minutes}m
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {timeRemaining.seconds}s
              </Badge>
            </div>
          </div>

          {/* User Stats */}
          {userStats && (
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">{userStats.current_points}</p>
                <p className="text-sm text-muted-foreground">Your Score</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-pink-400">#{userStats.current_rank}</p>
                <p className="text-sm text-muted-foreground">Your Rank</p>
              </div>
            </div>
          )}

          {/* Get Invite Link Button */}
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" onClick={copyInviteLink}>
            <Share2 className="mr-2 h-5 w-5" />
            Get My Invite Link
          </Button>
          {copied && (
            <p className="text-sm text-green-400 mt-2">Link copied to clipboard!</p>
          )}
        </CardContent>
      </Card>

      {/* Prizes Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🥇</div>
            <h3 className="text-xl font-bold mb-2">1st Place</h3>
            <p className="text-lg font-semibold text-yellow-400 mb-1">Funded Plaque</p>
            <p className="text-2xl font-bold text-yellow-400 mb-2">90% OFF</p>
            <p className="text-sm text-muted-foreground">Winner pays only 10%</p>
            <p className="text-xs text-muted-foreground mt-2">Valued at $99</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/20 to-slate-500/20 border-gray-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🥈</div>
            <h3 className="text-xl font-bold mb-2">2nd Place</h3>
            <p className="text-lg font-semibold text-gray-400 mb-1">5k Evaluation</p>
            <p className="text-2xl font-bold text-gray-400 mb-2">FREE entry</p>
            <p className="text-sm text-muted-foreground">No cost to enter</p>
            <p className="text-xs text-muted-foreground mt-2">Valued at $99–$149</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🥉</div>
            <h3 className="text-xl font-bold mb-2">3rd Place</h3>
            <p className="text-lg font-semibold text-orange-400 mb-1">5k Evaluation</p>
            <p className="text-2xl font-bold text-orange-400 mb-2">FREE entry</p>
            <p className="text-sm text-muted-foreground">No cost to enter</p>
            <p className="text-xs text-muted-foreground mt-2">Valued at $99–$149</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Section */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Leaderboard
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold">Rank</th>
                  <th className="text-left p-3 font-semibold">User</th>
                  <th className="text-right p-3 font-semibold">Points</th>
                  <th className="text-right p-3 font-semibold">Bonus</th>
                  <th className="text-right p-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr 
                    key={entry.user_id} 
                    className={`border-b border-border/50 ${
                      entry.user_id === user?.id ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    <td className="p-3 font-bold">{getRankIcon(entry.rank)}</td>
                    <td className="p-3">{entry.username}</td>
                    <td className="p-3 text-right">{entry.points}</td>
                    <td className="p-3 text-right text-green-400">+{entry.bonus_points}</td>
                    <td className="p-3 text-right font-bold">{entry.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* How Scoring Works */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            How Scoring Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="font-semibold mb-2">📊 Your score = Invited signups (1 pt) + Bonus points</p>
            <p className="text-sm text-muted-foreground mb-2">Bonus points:</p>
            <p className="text-sm text-green-400">+2 per invited user who logs 5+ trades within 7 days</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-semibold mb-2">Example:</p>
            <p className="text-sm">You invite 10 people → 10 points</p>
            <p className="text-sm">3 of them trade actively → +6 bonus</p>
            <p className="text-sm font-bold">Your total = 16 points</p>
          </div>
          <p className="text-sm text-muted-foreground italic">Quality &gt; quantity. Invite real traders.</p>
        </CardContent>
      </Card>

      {/* Your Progress Section */}
      {userStats && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm mb-2">Your invite link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded bg-background text-sm">
                  https://yunixofficial.com/invite/{userStats.invite_code}
                </code>
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-2xl font-bold text-purple-400">{userStats.total_invites}</p>
                <p className="text-xs text-muted-foreground">Total Invites</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-2xl font-bold text-blue-400">{userStats.verified_signups}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl font-bold text-green-400">{userStats.active_traders}</p>
                <p className="text-xs text-muted-foreground">Active Traders</p>
              </div>
              <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 text-center">
                <p className="text-2xl font-bold text-pink-400">{userStats.current_points}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm">
                Need <span className="font-bold text-yellow-400">
                  {entries[2]?.total_points ? entries[2].total_points - userStats.current_points + 1 : 0}
                </span> points to reach #3.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Shortcuts */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-400" />
            Share Your Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" onClick={shareToTwitter} className="flex items-center gap-2">
              <span className="text-blue-400">𝕏</span> Twitter
            </Button>
            <Button variant="outline" onClick={shareToTelegram} className="flex items-center gap-2">
              <span className="text-blue-400">✈️</span> Telegram
            </Button>
            <Button variant="outline" onClick={shareToWhatsApp} className="flex items-center gap-2">
              <span className="text-green-400">📱</span> WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rules Link */}
      <div className="text-center text-sm text-muted-foreground space-x-2">
        <Button variant="link" className="text-sm" onClick={() => navigate('/contest-rules')}>
          📋 Full Contest Rules
        </Button>
        <span>|</span>
        <span>Prizes provided by YUNIX & partner firms</span>
        <span>|</span>
        <span>No purchase necessary</span>
      </div>
    </div>
  );
}
