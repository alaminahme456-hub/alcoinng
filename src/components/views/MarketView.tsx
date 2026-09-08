'use client';

import { Component, useEffect, useState, useCallback, useRef, type ReactNode, type ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, apiFetch } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft, TrendingUp, Wallet, PiggyBank, TrendingUpIcon,
  ArrowUpCircle, ArrowDownCircle, Loader2,
  Trophy, XCircle, CheckCircle2, Clock, History, Filter,
  CheckCircle, ArrowUp, ArrowDown, Timer, CircleDollarSign,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatNaira(amount: any) {
  const num = Number(amount);
  if (isNaN(num)) return '\u20a60';
  return `\u20a6${num.toLocaleString()}`;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `0:${s.toString().padStart(2, '0')}`;
}

function formatCountdownPrecise(ms: number): string {
  if (ms <= 0) return '0:00.0';
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const remainder = totalSec - m * 60;
  const s = Math.floor(remainder);
  const tenths = Math.floor((remainder - s) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface PricePoint {
  time: string;
  price: number;
  timestamp: number;
}

interface TradeHistoryItem {
  id: string;
  prediction: 'UP' | 'DOWN';
  amount: number;
  multiplier: number;
  duration: number;
  result: 'win' | 'loss';
  profit: number;
  createdAt: string;
  entryPrice: number;
  exitPrice: number;
}

/** Shape returned by POST /api/market/trade and GET /api/market/active (when active) */
interface ActiveTrade {
  id: string;
  prediction: 'buy' | 'sell';
  amount: number;
  payoutMultiplier: number;
  duration: number;
  entryPrice: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  fundingWallet: string;
  remainingMs?: number;
}

/** Shape returned by POST /api/market/settle (settled trade) */
interface SettledTrade {
  id: string;
  prediction: 'buy' | 'sell';
  amount: number;
  payoutMultiplier: number;
  duration: number;
  entryPrice: number;
  exitPrice: number;
  startedAt: string;
  expiresAt: string;
  settledAt?: string;
  status: string;
  result: 'win' | 'loss';
  profit: number;
  fundingWallet: string;
}

type WalletType = 'reward' | 'deposit' | 'profit';
type Prediction = 'UP' | 'DOWN' | null;

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const DURATION_OPTIONS = [
  { label: '10 Seconds', value: 10 },
  { label: '30 Seconds', value: 30 },
  { label: '1 Minute', value: 60 },
  { label: '2 Minutes', value: 120 },
  { label: '5 Minutes', value: 300 },
  { label: '10 Minutes', value: 600 },
];

const WALLET_CONFIG: Record<WalletType, { label: string; icon: typeof Wallet; color: string; balanceKey: 'reward' | 'deposit' | 'profit' }> = {
  reward: { label: 'Reward Wallet', icon: Wallet, color: 'text-gold', balanceKey: 'reward' },
  deposit: { label: 'Deposit Wallet', icon: PiggyBank, color: 'text-alcoin-blue', balanceKey: 'deposit' },
  profit: { label: 'Profit Wallet', icon: TrendingUpIcon, color: 'text-emerald-400', balanceKey: 'profit' },
};

const HISTORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Wins', value: 'win' },
  { label: 'Losses', value: 'loss' },
];

/* ═══════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ═══════════════════════════════════════════════════════════ */

class MarketErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MarketView error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold">Trade Error</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'Something went wrong with the market.'}
            </p>
            <Button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="gradient-gold text-gold-foreground font-semibold"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function MarketViewWrapper() {
  return (
    <MarketErrorBoundary>
      <MarketView />
    </MarketErrorBoundary>
  );
}

function MarketView() {
  const { wallets, setWallets, setView } = useAppStore();

  /* ─── Price Chart ─── */
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI price simulation state
  const priceSimRef = useRef({
    price: 75 + Math.random() * 25,
    momentum: 0,
    volatility: 0.5,
    trend: 0,
    tickCount: 0,
  });

  /* ─── Trade Form ─── */
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('deposit');
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [placingTrade, setPlacingTrade] = useState(false);

  /* ─── Active Trade (server-driven lifecycle) ─── */
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [settling, setSettling] = useState(false);

  /* ─── Settled Result ─── */
  const [settleResult, setSettleResult] = useState<{
    trade: SettledTrade;
    result: 'win' | 'loss';
    message: string;
  } | null>(null);

  /* ─── History ─── */
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all');

  /* ─── Refs for intervals & cleanup ─── */
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSettleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingRef = useRef(false); // guard against double-settle
  const mountedRef = useRef(true);

  /* ═══════════════════════════════════════════════════════════
     PRICE SIMULATION (kept from original — smooth local chart)
     ═══════════════════════════════════════════════════════════ */

  const generatePriceTick = useCallback(() => {
    const sim = priceSimRef.current;
    sim.tickCount++;

    if (sim.tickCount % 20 === 0) {
      sim.trend = (Math.random() - 0.5) * 0.6;
    }

    const volTarget = 0.4 + Math.random() * 0.8;
    sim.volatility = 0.85 * sim.volatility + 0.15 * volTarget;

    const meanTarget = 80;
    const meanPull = (meanTarget - sim.price) * 0.002;

    const shock = (Math.random() - 0.5) * 2 * sim.volatility;
    sim.momentum = 0.7 * sim.momentum + 0.3 * (shock + sim.trend);

    const delta = sim.momentum + meanPull;
    sim.price = Math.max(10, Math.min(200, sim.price + delta));

    return Math.round(sim.price * 100) / 100;
  }, []);

  const initChart = useCallback(() => {
    const sim = priceSimRef.current;
    const points: PricePoint[] = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      const vol = 0.3 + Math.random() * 0.5;
      const change = (Math.random() - 0.48) * vol * 2;
      sim.momentum = 0.6 * sim.momentum + 0.4 * change;
      sim.price = Math.max(10, Math.min(200, sim.price + sim.momentum));
      const price = Math.round(sim.price * 100) / 100;
      points.push({
        time: new Date(now - i * 2000).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        price,
        timestamp: now - i * 2000,
      });
    }
    setPriceData(points);
    setCurrentPrice(points[points.length - 1].price);
    setPrevPrice(points[points.length - 2].price);
    setChartLoading(false);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     API HELPERS
     ═══════════════════════════════════════════════════════════ */

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await apiFetch('/api/market/history');
      const rawTrades = data.trades || [];
      const mapped: TradeHistoryItem[] = rawTrades.map((t: any) => ({
        id: t.id,
        prediction: (t.prediction === 'buy' ? 'UP' : 'DOWN') as 'UP' | 'DOWN',
        amount: Number(t.amount),
        multiplier: Number(t.payout_multiplier ?? t.multiplier ?? 1),
        duration: Number(t.duration),
        result: t.result as 'win' | 'loss',
        profit: Number(t.profit ?? 0),
        createdAt: t.created_at,
        entryPrice: Number(t.start_price ?? t.entry_price),
        exitPrice: Number(t.end_price ?? t.exit_price),
      }));
      setHistory(mapped);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshWallets = useCallback(async () => {
    try {
      const data = await apiFetch('/api/user/wallets');
      if (data) {
        const getBal = (w: any) => typeof w === 'object' && w !== null ? (w.balance ?? 0) : (w ?? 0);
        setWallets({ reward: getBal(data.reward), deposit: getBal(data.deposit), profit: getBal(data.profit) });
      }
    } catch {
      // silent
    }
  }, [setWallets]);

  const updateWalletsFromApi = useCallback((walletsData: any) => {
    if (!walletsData || !Array.isArray(walletsData)) return;
    const map: Record<string, number> = { reward: 0, deposit: 0, profit: 0 };
    for (const w of walletsData) {
      if (w.type && w.type in map) {
        map[w.type] = Number(w.balance ?? 0);
      }
    }
    setWallets({ reward: map.reward, deposit: map.deposit, profit: map.profit });
  }, [setWallets]);

  /* ═══════════════════════════════════════════════════════════
     SETTLE TRADE
     ═══════════════════════════════════════════════════════════ */

  const settleTrade = useCallback(async (tradeId: string) => {
    // Double-settle guard
    if (settlingRef.current) return;
    settlingRef.current = true;
    setSettling(true);

    try {
      const data = await apiFetch('/api/market/settle', {
        method: 'POST',
        body: JSON.stringify({ tradeId }),
      });

      if (!mountedRef.current) return;

      const result: 'win' | 'loss' = data.result || (data.trade?.result) || 'loss';
      const trade: SettledTrade = data.trade;

      // Update wallets from settle response
      if (data.wallets) {
        updateWalletsFromApi(data.wallets);
      } else {
        refreshWallets();
      }

      // Clear active trade
      setActiveTrade(null);
      setRemainingMs(0);

      // Show result
      setSettleResult({
        trade,
        result,
        message: data.message || (result === 'win' ? 'Trade won!' : 'Trade lost.'),
      });

      toast.success(
        result === 'win' ? `Trade Won! +${formatNaira(trade.profit)}` : 'Trade Lost',
        { description: data.message || '' },
      );

      fetchHistory();

      // Auto-dismiss result after 5 seconds
      resultTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setSettleResult(null);
        }
      }, 5000);

    } catch (err: any) {
      if (!mountedRef.current) return;
      toast.error(err.message || 'Settlement failed');
      // Even on error, clear active state to avoid being stuck
      setActiveTrade(null);
      setRemainingMs(0);
      refreshWallets();
    } finally {
      settlingRef.current = false;
      setSettling(false);
    }
  }, [fetchHistory, refreshWallets, updateWalletsFromApi]);

  /* ═══════════════════════════════════════════════════════════
     CHECK ACTIVE TRADE (on mount & polling)
     ═══════════════════════════════════════════════════════════ */

  const checkActiveTrade = useCallback(async () => {
    try {
      const data = await apiFetch('/api/market/active');

      if (!mountedRef.current) return;

      if (data.trade && data.trade.status === 'active') {
        // Active trade found — resume it
        setActiveTrade(data.trade);
        const expiresAt = new Date(data.trade.expiresAt).getTime();
        const now = Date.now();
        const remaining = expiresAt - now;
        setRemainingMs(Math.max(0, remaining));
      } else if (data.trade && data.settled) {
        // Trade was auto-settled by the server (expired between polls)
        const trade = data.trade;
        const result: 'win' | 'loss' = trade.result || (trade.status === 'won' ? 'win' : 'loss');

        setActiveTrade(null);
        setRemainingMs(0);

        setSettleResult({
          trade: trade as SettledTrade,
          result,
          message: result === 'win' ? 'Trade won!' : 'Trade lost.',
        });

        refreshWallets();
        fetchHistory();

        // Auto-dismiss after 5s
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setSettleResult(null);
        }, 5000);
      } else {
        // No active trade
        setActiveTrade(null);
        setRemainingMs(0);
      }
    } catch {
      // silent — don't disrupt UI on poll failure
    }
  }, [fetchHistory, refreshWallets]);

  /* ═══════════════════════════════════════════════════════════
     PLACE TRADE
     ═══════════════════════════════════════════════════════════ */

  const availableBalance = wallets[WALLET_CONFIG[selectedWallet].balanceKey];
  const amountNum = parseFloat(tradeAmount) || 0;

  const handleTrade = useCallback(async () => {
    if (!prediction || amountNum <= 0) return;
    if (amountNum > availableBalance) {
      toast.error('Insufficient balance', {
        description: `Your ${WALLET_CONFIG[selectedWallet].label} has ${formatNaira(availableBalance)}`,
      });
      return;
    }
    if (activeTrade) {
      toast.error('You already have an active trade');
      return;
    }

    setPlacingTrade(true);

    try {
      const data = await apiFetch('/api/market/trade', {
        method: 'POST',
        body: JSON.stringify({
          wallet: selectedWallet,
          prediction: prediction === 'UP' ? 'buy' : 'sell',
          amount: amountNum,
          duration,
        }),
      });

      if (!mountedRef.current) return;

      // Update wallets from trade response (balance was deducted)
      if (data.wallets) {
        updateWalletsFromApi(data.wallets);
      } else {
        refreshWallets();
      }

      // Set active trade
      const trade: ActiveTrade = data.trade;
      setActiveTrade(trade);

      // Calculate remaining time from server's perspective
      const expiresAt = new Date(trade.expiresAt).getTime();
      const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
      const serverRemaining = expiresAt - serverTime;
      setRemainingMs(Math.max(0, serverRemaining));

      // Reset form
      setPrediction(null);
      setTradeAmount('');

      toast.success('Trade placed!', { description: `${prediction === 'UP' ? 'BUY' : 'SELL'} \u2014 ${formatNaira(amountNum)} for ${duration}s` });

    } catch (err: any) {
      toast.error(err.message || 'Trade failed');
    } finally {
      setPlacingTrade(false);
    }
  }, [prediction, amountNum, availableBalance, selectedWallet, duration, activeTrade, refreshWallets, updateWalletsFromApi]);

  /* ═══════════════════════════════════════════════════════════
     EFFECTS
     ═══════════════════════════════════════════════════════════ */

  // Mount: init chart, fetch history, check for active trade
  useEffect(() => {
    mountedRef.current = true;

    // Schedule async work outside the synchronous effect body
    const init = async () => {
      // Build chart data imperatively (same logic as initChart)
      const sim = priceSimRef.current;
      const points: PricePoint[] = [];
      const now = Date.now();
      for (let i = 59; i >= 0; i--) {
        const vol = 0.3 + Math.random() * 0.5;
        const change = (Math.random() - 0.48) * vol * 2;
        sim.momentum = 0.6 * sim.momentum + 0.4 * change;
        sim.price = Math.max(10, Math.min(200, sim.price + sim.momentum));
        const price = Math.round(sim.price * 100) / 100;
        points.push({
          time: new Date(now - i * 2000).toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
          }),
          price,
          timestamp: now - i * 2000,
        });
      }
      setPriceData(points);
      setCurrentPrice(points[points.length - 1].price);
      setPrevPrice(points[points.length - 2].price);
      setChartLoading(false);

      fetchHistory();
      checkActiveTrade();
    };
    init();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchHistory, checkActiveTrade]);

  // Tick new price every 1.5 seconds
  useEffect(() => {
    priceIntervalRef.current = setInterval(() => {
      const newPrice = generatePriceTick();
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setPrevPrice(currentPrice);
      setCurrentPrice(newPrice);
      setPriceData((prev) => {
        const next = [...prev, { time: timeStr, price: newPrice, timestamp: Date.now() }];
        return next.slice(-60);
      });
    }, 1500);
    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [generatePriceTick, currentPrice]);

  // High-frequency countdown (100ms) — server-synced via expires_at
  useEffect(() => {
    if (!activeTrade) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const expiresAt = new Date(activeTrade.expiresAt).getTime();

    // Update every 100ms for smooth countdown
    countdownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;
      setRemainingMs(remaining);

      if (remaining <= 0 && !settlingRef.current) {
        // Countdown reached zero — settle the trade
        setRemainingMs(0);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        settleTrade(activeTrade.id);
      }
    }, 100);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [activeTrade, settleTrade]);

  // Auto-settle polling — every 5 seconds while trade is active
  useEffect(() => {
    if (!activeTrade) {
      if (autoSettleIntervalRef.current) {
        clearInterval(autoSettleIntervalRef.current);
        autoSettleIntervalRef.current = null;
      }
      return;
    }

    autoSettleIntervalRef.current = setInterval(() => {
      checkActiveTrade();
    }, 5000);

    return () => {
      if (autoSettleIntervalRef.current) {
        clearInterval(autoSettleIntervalRef.current);
        autoSettleIntervalRef.current = null;
      }
    };
  }, [activeTrade, checkActiveTrade]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  /* ═══════════════════════════════════════════════════════════
     DERIVED VALUES
     ═══════════════════════════════════════════════════════════ */

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter((t) => t.result === historyFilter);

  const priceChange = prevPrice !== null && currentPrice !== null
    ? currentPrice - prevPrice
    : 0;
  const priceUp = priceChange >= 0;

  const isTradeActive = activeTrade !== null;
  const tradeProgress = activeTrade
    ? Math.min(100, Math.max(0, ((activeTrade.duration * 1000 - remainingMs) / (activeTrade.duration * 1000)) * 100))
    : 0;

  // CustomTooltip is stable outside render — avoids react-hooks lint
  const customTooltipRender = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-strong rounded-lg p-2 text-xs border border-white/10">
          <p className="text-muted-foreground">{payload[0].payload.time}</p>
          <p className="font-semibold text-gold">{formatNaira(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

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
            <TrendingUp className="w-4 h-4 text-gold-foreground" />
          </div>
          <h1 className="font-semibold text-lg">AL Coin Market</h1>
        </div>
        {isTradeActive && (
          <Badge className="ml-auto bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
            TRADE ACTIVE
          </Badge>
        )}
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* ═══════ Price Chart ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Live Price Chart</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">LIVE</span>
            </div>
          </div>

          {chartLoading ? (
            <Skeleton className="h-48 rounded-lg bg-white/5" />
          ) : priceData.length === 0 ? (
            <div className="h-48 rounded-lg bg-white/5 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Waiting for price data...</p>
            </div>
          ) : (
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradientUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="priceGradientDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(212, 175, 55, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#8888a0' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: '#8888a0' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    tickFormatter={(v: any) => v != null ? `\u20a6${Number(v).toFixed(0)}` : ''}
                  />
                  <Tooltip content={customTooltipRender} />
                  {/* Entry price horizontal line when trade is active */}
                  {activeTrade && (
                    <ReferenceLine
                      y={activeTrade.entryPrice}
                      stroke={activeTrade.prediction === 'buy' ? '#34d399' : '#f87171'}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Entry \u20a6${activeTrade.entryPrice.toFixed(2)}`,
                        position: 'right',
                        fill: activeTrade.prediction === 'buy' ? '#34d399' : '#f87171',
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={priceUp ? '#34d399' : priceChange !== 0 ? '#f87171' : '#d4af37'}
                    strokeWidth={2}
                    fill={priceUp ? 'url(#priceGradientUp)' : priceChange !== 0 ? 'url(#priceGradientDown)' : 'none'}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* ═══════ Current Price Display ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl p-4 text-center gold-glow"
        >
          <p className="text-xs text-muted-foreground mb-1">AL Coin Current Price</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentPrice}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`text-3xl sm:text-4xl font-bold font-mono ${
                priceUp ? 'text-emerald-400' : priceChange !== 0 ? 'text-red-400' : 'gradient-gold-text'
              }`}
            >
              {currentPrice !== null ? formatNaira(currentPrice) : '---'}
            </motion.p>
          </AnimatePresence>
          {priceChange !== 0 && (
            <p className={`text-xs mt-1 font-medium ${priceUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {priceUp ? '\u25b2' : '\u25bc'} {priceUp ? '+' : ''}{formatNaira(Math.abs(priceChange))}
            </p>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            ACTIVE TRADE PANEL — Prominent, server-driven
            ═══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {activeTrade && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-strong rounded-xl overflow-hidden border border-amber-500/20"
            >
              {/* Header bar */}
              <div className={`px-4 py-2.5 flex items-center justify-between ${
                activeTrade.prediction === 'buy'
                  ? 'bg-emerald-500/10 border-b border-emerald-500/20'
                  : 'bg-red-500/10 border-b border-red-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {activeTrade.prediction === 'buy' ? (
                    <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-bold text-sm ${activeTrade.prediction === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {activeTrade.prediction === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] px-1.5">
                    ACTIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span className={`font-bold font-mono text-lg tabular-nums ${
                    remainingMs <= 5000 ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {formatCountdownPrecise(remainingMs)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/5">
                <motion.div
                  className={`h-full ${
                    activeTrade.prediction === 'buy' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${tradeProgress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>

              {/* Trade details */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Entry Price */}
                  <div className="glass rounded-lg p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Price</p>
                    <p className="text-sm font-bold font-mono">{formatNaira(activeTrade.entryPrice)}</p>
                  </div>

                  {/* Current Price */}
                  <div className="glass rounded-lg p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Price</p>
                    <p className={`text-sm font-bold font-mono ${
                      currentPrice !== null && currentPrice > activeTrade.entryPrice
                        ? 'text-emerald-400'
                        : currentPrice !== null && currentPrice < activeTrade.entryPrice
                          ? 'text-red-400'
                          : ''
                    }`}>
                      {currentPrice !== null ? formatNaira(currentPrice) : '---'}
                    </p>
                  </div>

                  {/* Investment */}
                  <div className="glass rounded-lg p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Investment</p>
                    <p className="text-sm font-bold">{formatNaira(activeTrade.amount)}</p>
                  </div>

                  {/* Potential Payout */}
                  <div className="glass rounded-lg p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Potential Payout</p>
                    <p className="text-sm font-bold text-gold">
                      {formatNaira(Math.round(activeTrade.amount * activeTrade.payoutMultiplier))}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({activeTrade.payoutMultiplier.toFixed(2)}x)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Duration & Wallet info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Duration: {DURATION_OPTIONS.find(d => d.value === activeTrade.duration)?.label || `${activeTrade.duration}s`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    <span>From: {WALLET_CONFIG[activeTrade.fundingWallet as WalletType]?.label || activeTrade.fundingWallet}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════
            SETTLE RESULT OVERLAY
            ═══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {settleResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`glass-strong rounded-2xl p-8 max-w-sm w-full text-center border ${
                  settleResult.result === 'win' ? 'border-emerald-500/30' : 'border-red-500/30'
                }`}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    settleResult.result === 'win' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}
                >
                  {settleResult.result === 'win' ? (
                    <Trophy className="w-12 h-12 text-emerald-400" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-400" />
                  )}
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`text-2xl font-bold mb-2 ${
                    settleResult.result === 'win' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {settleResult.result === 'win' ? 'Congratulations! You Won!' : 'Trade Lost'}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground mb-4"
                >
                  {settleResult.message}
                </motion.p>

                {/* Trade details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass rounded-lg p-3 text-sm space-y-1.5 mb-4"
                >
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Direction</span>
                    <span className={`font-medium ${settleResult.trade.prediction === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {settleResult.trade.prediction === 'buy' ? 'BUY (UP)' : 'SELL (DOWN)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Price</span>
                    <span className="font-medium">{formatNaira(settleResult.trade.entryPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Price</span>
                    <span className="font-medium">{formatNaira(settleResult.trade.exitPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investment</span>
                    <span className="font-medium">{formatNaira(settleResult.trade.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multiplier</span>
                    <span className="font-medium text-gold">{settleResult.trade.payoutMultiplier.toFixed(2)}x</span>
                  </div>

                  {settleResult.result === 'win' ? (
                    <>
                      <div className="border-t border-white/10 pt-1.5 flex justify-between">
                        <span className="text-muted-foreground font-medium">Profit</span>
                        <span className="font-bold text-emerald-400">+{formatNaira(settleResult.trade.profit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">Total Returned</span>
                        <span className="font-bold text-emerald-400">{formatNaira(settleResult.trade.amount + settleResult.trade.profit)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="border-t border-white/10 pt-1.5 flex justify-between">
                      <span className="text-muted-foreground font-medium">Loss</span>
                      <span className="font-bold text-red-400">-{formatNaira(settleResult.trade.amount)}</span>
                    </div>
                  )}
                </motion.div>

                {/* Trade ID */}
                <p className="text-[10px] text-muted-foreground tracking-wider mb-4">
                  Trade #{settleResult.trade.id.slice(0, 8).toUpperCase()}
                </p>

                <Button
                  onClick={() => {
                    if (resultTimeoutRef.current) { clearTimeout(resultTimeoutRef.current); resultTimeoutRef.current = null; }
                    setSettleResult(null);
                  }}
                  className={`w-full font-semibold h-11 ${
                    settleResult.result === 'win'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  }`}
                >
                  Continue Trading
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════
            PLACE TRADE PANEL
            ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Place Trade</h2>
            {isTradeActive && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                <Clock className="w-3 h-3 mr-1" />
                Trade in progress
              </Badge>
            )}
          </div>

          {/* 1. Select Wallet */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select Wallet</p>
            <Select
              value={selectedWallet}
              onValueChange={(v) => setSelectedWallet(v as WalletType)}
              disabled={isTradeActive}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/10 focus:border-gold h-11">
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = WALLET_CONFIG[selectedWallet];
                    return <>
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      <SelectValue />
                    </>;
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {(Object.keys(WALLET_CONFIG) as WalletType[]).map((key) => {
                  const cfg = WALLET_CONFIG[key];
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                        <span>{cfg.label}</span>
                        <span className="text-muted-foreground ml-auto">({formatNaira(wallets[cfg.balanceKey])})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Balance: <span className="text-foreground font-medium">{formatNaira(availableBalance)}</span>
            </p>
          </div>

          {/* 2. Prediction — Buy / Sell */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Prediction</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={!isTradeActive ? { scale: 0.97 } : undefined}
                onClick={() => !isTradeActive && setPrediction(prediction === 'UP' ? null : 'UP')}
                disabled={isTradeActive}
                className={`rounded-lg p-2.5 flex items-center gap-2 transition-all border-2 ${
                  prediction === 'UP'
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'glass border-transparent hover:border-emerald-500/20'
                } ${isTradeActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ArrowUpCircle className={`w-5 h-5 ${prediction === 'UP' ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-bold ${prediction === 'UP' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  Buy
                </span>
                <span className={`text-[10px] ${prediction === 'UP' ? 'text-emerald-400/70' : 'text-muted-foreground/60'}`}>
                  UP
                </span>
              </motion.button>

              <motion.button
                whileTap={!isTradeActive ? { scale: 0.97 } : undefined}
                onClick={() => !isTradeActive && setPrediction(prediction === 'DOWN' ? null : 'DOWN')}
                disabled={isTradeActive}
                className={`rounded-lg p-2.5 flex items-center gap-2 transition-all border-2 ${
                  prediction === 'DOWN'
                    ? 'bg-red-500/15 border-red-500/50'
                    : 'glass border-transparent hover:border-red-500/20'
                } ${isTradeActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ArrowDownCircle className={`w-5 h-5 ${prediction === 'DOWN' ? 'text-red-400' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-bold ${prediction === 'DOWN' ? 'text-red-400' : 'text-muted-foreground'}`}>
                  Sell
                </span>
                <span className={`text-[10px] ${prediction === 'DOWN' ? 'text-red-400/70' : 'text-muted-foreground/60'}`}>
                  DOWN
                </span>
              </motion.button>
            </div>
          </div>

          {/* 3. Investment Amount */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Investment</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                \u20a6
              </span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="pl-8 pr-16 bg-white/5 border-white/10 focus:border-gold h-12 text-lg font-semibold"
                min="0"
                max={availableBalance}
                disabled={isTradeActive}
              />
              <button
                type="button"
                onClick={() => !isTradeActive && setTradeAmount(availableBalance.toString())}
                disabled={isTradeActive}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-medium text-gold bg-gold/10 hover:bg-gold/20 transition-colors ${
                  isTradeActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                MAX
              </button>
            </div>
            {amountNum > availableBalance && amountNum > 0 && (
              <p className="text-[11px] text-red-400">
                Amount exceeds your {WALLET_CONFIG[selectedWallet].label} balance of {formatNaira(availableBalance)}
              </p>
            )}
          </div>

          {/* 4. Trade Duration */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Trade Duration</p>
            <Select
              value={duration.toString()}
              onValueChange={(v) => setDuration(parseInt(v))}
              disabled={isTradeActive}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/10 focus:border-gold h-11">
                <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Place Trade Button */}
          <Button
            onClick={handleTrade}
            disabled={!prediction || amountNum <= 0 || amountNum > availableBalance || placingTrade || isTradeActive || settling}
            className="w-full gradient-gold text-gold-foreground font-bold h-13 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTradeActive ? (
              <span className="flex items-center gap-2">
                <Timer className="w-5 h-5 animate-pulse" />
                Trade in Progress...
              </span>
            ) : !prediction || amountNum <= 0 ? (
              'Select Prediction & Amount'
            ) : amountNum > availableBalance ? (
              'Insufficient Balance'
            ) : placingTrade ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Trade...
              </span>
            ) : (
              `Place Trade \u2014 ${formatNaira(amountNum)}`
            )}
          </Button>
        </motion.div>

        {/* ═══════ Trade History ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Trade History</h2>
            </div>
            <div className="flex gap-1">
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setHistoryFilter(f.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    historyFilter === f.value
                      ? 'glass-strong text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trades found</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto scrollbar-thin -mx-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground">Side</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground text-right">Multi</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground text-right">Time</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground text-right">Result</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((trade) => (
                    <TableRow key={trade.id} className="border-white/5">
                      <TableCell className="text-xs text-muted-foreground py-2">
                        {new Date(trade.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          className={`text-[10px] gap-0.5 ${
                            trade.prediction === 'UP'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {trade.prediction === 'UP' ? (
                            <ArrowUpCircle className="w-3 h-3" />
                          ) : (
                            <ArrowDownCircle className="w-3 h-3" />
                          )}
                          {trade.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-right py-2">
                        {formatNaira(trade.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right py-2">
                        {(trade.multiplier ?? 1).toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right py-2">
                        {DURATION_OPTIONS.find((d) => d.value === trade.duration)?.label || `${trade.duration}s`}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Badge
                          className={`text-[10px] ${
                            trade.result === 'win'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {trade.result === 'win' ? (
                            <CheckCircle2 className="w-3 h-3 mr-0.5" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-0.5" />
                          )}
                          {trade.result.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-xs font-bold text-right py-2 ${
                          trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {trade.profit >= 0 ? '+' : ''}{formatNaira(trade.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
