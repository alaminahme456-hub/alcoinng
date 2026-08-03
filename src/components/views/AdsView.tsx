'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, Tv, Clock, Coins, Play, CheckCircle2,
  Loader2, AlertCircle, TvIcon,
} from 'lucide-react';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
}

interface AdItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  reward: number;
  thumbnail?: string;
  active: boolean;
}

type WatchingState = null | { adId: string; remaining: number; total: number };

const THUMBNAIL_COLORS = [
  'from-gold/30 to-amber-700/30',
  'from-blue-500/30 to-cyan-600/30',
  'from-emerald-500/30 to-teal-600/30',
  'from-purple-500/30 to-violet-600/30',
  'from-rose-500/30 to-pink-600/30',
  'from-orange-500/30 to-yellow-600/30',
];

export default function AdsView() {
  const { setView } = useAppStore();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [watching, setWatching] = useState<WatchingState>(null);
  const [watchingTitle, setWatchingTitle] = useState('');
  const [watchingReward, setWatchingReward] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/api/ads');
      setAds(data.ads || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startWatching = (ad: AdItem) => {
    setWatching({ adId: ad.id, remaining: ad.duration, total: ad.duration });
    setWatchingTitle(ad.title);
    setWatchingReward(ad.reward);

    timerRef.current = setInterval(() => {
      setWatching((prev) => {
        if (!prev) return null;
        const next = prev.remaining - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          // Mark as watched and call API
          completeWatch(ad.id, ad.reward);
          return null;
        }
        return { ...prev, remaining: next };
      });
    }, 1000);
  };

  const completeWatch = async (adId: string, reward: number) => {
    try {
      await apiFetch('/api/ads/watch', {
        method: 'POST',
        body: JSON.stringify({ adId }),
      });
      setWatchedIds((prev) => new Set(prev).add(adId));
      toast.success(`You earned ${formatNaira(reward)}!`, {
        description: 'Reward has been added to your wallet.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to record ad watch');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const progress = watching
    ? ((watching.total - watching.remaining) / watching.total) * 100
    : 0;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <Tv className="w-4 h-4 text-gold-foreground" />
          </div>
          <h1 className="font-semibold text-lg">Ads Center</h1>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Watching Overlay */}
        <AnimatePresence>
          {watching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center"
              >
                <div className="w-20 h-20 rounded-full gradient-gold/20 flex items-center justify-center mx-auto mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Play className="w-8 h-8 text-gold" />
                  </motion.div>
                </div>

                <h3 className="font-semibold text-lg mb-1">Watching Ad</h3>
                <p className="text-sm text-muted-foreground mb-4">{watchingTitle}</p>

                {/* Countdown */}
                <div className="text-5xl font-bold gradient-gold-text mb-4 font-mono">
                  {formatTime(watching.remaining)}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                  <motion.div
                    className="h-full gradient-gold rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Don&apos;t close this screen. Reward: {formatNaira(watchingReward)}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 border-l-4 border-l-gold"
        >
          <div className="flex items-center gap-3">
            <TvIcon className="w-5 h-5 text-gold shrink-0" />
            <div>
              <p className="text-sm font-medium">Watch &amp; Earn</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Watch video ads to earn AL Coin rewards directly to your wallet.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 text-center"
          >
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4 border-white/10"
              onClick={fetchAds}
            >
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && ads.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-8 text-center"
          >
            <Tv className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No Ads Available</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Check back later for new earning opportunities.
            </p>
          </motion.div>
        )}

        {/* Ad Cards */}
        {!loading && !error && ads.length > 0 && (
          <div className="space-y-3">
            {ads.map((ad, index) => {
              const isWatched = watchedIds.has(ad.id);
              const isCurrentlyWatching = watching?.adId === ad.id;

              return (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass rounded-xl overflow-hidden transition-all duration-200 ${
                    isWatched
                      ? 'opacity-60'
                      : 'hover:border-gold/30 hover:shadow-[0_0_20px_rgba(212,168,83,0.08)]'
                  }`}
                >
                  <div className="flex">
                    {/* Thumbnail Placeholder */}
                    <div
                      className={`w-28 sm:w-36 shrink-0 bg-gradient-to-br ${
                        THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length]
                      } flex items-center justify-center relative`}
                    >
                      {isWatched ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <Play className="w-8 h-8 text-white/80" />
                      )}
                      {/* Duration Badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(ad.duration)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-semibold text-sm truncate pr-2">
                          {ad.title}
                        </h3>
                        {ad.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {ad.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <Badge
                          variant="secondary"
                          className="bg-gold/10 text-gold border-gold/20 text-xs gap-1"
                        >
                          <Coins className="w-3 h-3" />
                          {formatNaira(ad.reward)}
                        </Badge>

                        <Button
                          size="sm"
                          disabled={isWatched || isCurrentlyWatching}
                          onClick={() => startWatching(ad)}
                          className={`h-9 px-4 text-xs font-semibold min-w-[80px] ${
                            isWatched
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'
                              : 'gradient-gold text-gold-foreground'
                          }`}
                        >
                          {isWatched ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Watched
                            </span>
                          ) : isCurrentlyWatching ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Watching...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Play className="w-3.5 h-3.5" />
                              Watch
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {!loading && ads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-gold">{ads.length}</p>
                <p className="text-xs text-muted-foreground">Available Ads</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">{watchedIds.size}</p>
                <p className="text-xs text-muted-foreground">Watched</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
