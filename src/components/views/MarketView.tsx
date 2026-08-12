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
  CheckCircle, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

function formatNaira(amount: any) {
  const num = Number(amount);
  if (isNaN(num)) return '\u20a60';
  return `\u20a6${num.toLocaleString()}`;
}

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

type WalletType = 'reward' | 'deposit' | 'profit';
type Prediction = 'UP' | 'DOWN' | null;

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

// Local error boundary — prevents app-level crash from showing error.tsx
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

export default function MarketViewWrapper() {
  return (
    <MarketErrorBoundary>
      <MarketView />
    </MarketErrorBoundary>
  );
}

function MarketView() {
  const { wallets, setWallets, setView } = useAppStore();

  // Chart data — client-side AI price simulation
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

  // Trade form
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('deposit');
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [duration, setDuration] = useState<number>(30);

  // Trade execution
  const [trading, setTrading] = useState(false);
  const [tradePhase, setTradePhase] = useState<'idle' | 'confirmed' | 'monitoring' | 'result'>('idle');
  const [tradeResult, setTradeResult] = useState<{ win: boolean; profit: number; totalReturn: number; message: string; multiplier: number; amount?: number } | null>(null);

  // Monitor screen data (stored in ref to avoid stale closures)
  const monitorInfoRef = useRef<{
    tradeId: string;
    prediction: 'UP' | 'DOWN';
    startPrice: number;
    startTime: number;
    endTime: number;
    duration: number;
    amount: number;
  } | null>(null);

  // History
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Generate AI-driven price tick with momentum, trend, mean-reversion & volatility clustering
  const generatePriceTick = useCallback(() => {
    const sim = priceSimRef.current;
    sim.tickCount++;

    // Shift trend slowly every ~20 ticks
    if (sim.tickCount % 20 === 0) {
      sim.trend = (Math.random() - 0.5) * 0.6;
    }

    // GARCH-like volatility clustering
    const volTarget = 0.4 + Math.random() * 0.8;
    sim.volatility = 0.85 * sim.volatility + 0.15 * volTarget;

    // Mean-reversion pull toward 75-85 range
    const meanTarget = 80;
    const meanPull = (meanTarget - sim.price) * 0.002;

    // Random shock + momentum + trend + mean reversion
    const shock = (Math.random() - 0.5) * 2 * sim.volatility;
    sim.momentum = 0.7 * sim.momentum + 0.3 * (shock + sim.trend);

    const delta = sim.momentum + meanPull;
    sim.price = Math.max(10, Math.min(200, sim.price + delta));

    return Math.round(sim.price * 100) / 100;
  }, []);

  // Initialize chart with 60 historical points, then tick every 1.5s
  const initChart = useCallback(() => {
    const sim = priceSimRef.current;
    const points: PricePoint[] = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      // Generate a tick for each historical point
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

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await apiFetch('/api/market/history');
      const rawTrades = data.trades || [];
      // Map DB columns to frontend interface
      const mapped: TradeHistoryItem[] = rawTrades.map((t: any) => ({
        id: t.id,
        prediction: (t.prediction === 'buy' ? 'UP' : 'DOWN') as 'UP' | 'DOWN',
        amount: Number(t.amount),
        multiplier: Number(t.payout_multiplier ?? t.multiplier ?? 1),
        duration: Number(t.duration),
        result: t.result as 'win' | 'loss',
        profit: Number(t.profit ?? 0),
        createdAt: t.created_at,
        entryPrice: Number(t.start_price),
        exitPrice: Number(t.end_price),
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

  // Initialize chart with historical data
  useEffect(() => {
    initChart();
    fetchHistory();
  }, [initChart, fetchHistory]);

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

  // Derived values (must be before callbacks that reference them)
  const availableBalance = wallets[WALLET_CONFIG[selectedWallet].balanceKey];
  const amountNum = parseFloat(tradeAmount) || 0;

  // Trade countdown — ref-based, avoids all stale closure issues
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDisplayRef = useRef(0);
  const pendingTradeResult = useRef<any>(null);
  const [, forceUpdate] = useState(0);
  const tradeStartTimeRef = useRef<number>(0);
  const tradingRef = useRef(false);
  const resultAutoReturnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    countdownDisplayRef.current = seconds;

    countdownRef.current = setInterval(() => {
      countdownDisplayRef.current -= 1;
      forceUpdate((n) => n + 1);
      if (countdownDisplayRef.current <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        countdownDisplayRef.current = 0;
        // Read pre-computed result from ref — no closure dependency on state
        const result = pendingTradeResult.current;
        if (result) {
          pendingTradeResult.current = null;
          setTradeResult(result);
          setTradePhase('result');
          tradingRef.current = false;
          toast.success(
            result.win ? `Trade Won! +${formatNaira(result.profit)}` : 'Trade Lost',
            { description: result.message || '' }
          );
          setTrading(false);
          fetchHistory();
          refreshWallets();
          forceUpdate((n) => n + 1);
        }
      }
    }, 1000);
  }, [fetchHistory, refreshWallets]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    countdownDisplayRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (resultAutoReturnRef.current) clearTimeout(resultAutoReturnRef.current);
    };
  }, []);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `0:${s.toString().padStart(2, '0')}`;
  };

  const handleTrade = async () => {
    if (!prediction || amountNum <= 0) return;
    if (amountNum > availableBalance) {
      toast.error('Insufficient balance', {
        description: `Your ${WALLET_CONFIG[selectedWallet].label} has ${formatNaira(availableBalance)}`,
      });
      return;
    }

    // Clean slate
    setTrading(true);
    tradingRef.current = true;
    setTradePhase('confirmed');
    setTradeResult(null);
    pendingTradeResult.current = null;
    monitorInfoRef.current = null;
    if (resultAutoReturnRef.current) { clearTimeout(resultAutoReturnRef.current); resultAutoReturnRef.current = null; }
    stopCountdown();

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

      // Pre-compute the display result NOW (while amountNum is current)
      const isWin = data.trade?.result === 'win';
      const multiplierUsed = Number(data.trade?.payout_multiplier) || 1.0;
      const totalReturn = isWin ? Math.round(amountNum * multiplierUsed * 100) / 100 : 0;
      const profit = isWin ? Math.round((totalReturn - amountNum) * 100) / 100 : 0;

      const precomputed = {
        win: isWin,
        profit: Number(profit) || 0,
        totalReturn: Number(totalReturn) || 0,
        multiplier: Number(multiplierUsed) || 1,
        message: data.message || (isWin ? 'Trade successful!' : 'Better luck next time.'),
        amount: amountNum,
      };

      // Store monitor info
      const now = Date.now();
      const startPrice = Number(data.trade?.start_price) || currentPrice || 80;
      monitorInfoRef.current = {
        tradeId: data.trade?.id || `AL${Date.now().toString(36).toUpperCase()}`,
        prediction: prediction!,
        startPrice,
        startTime: now,
        endTime: now + duration * 1000,
        duration,
        amount: amountNum,
      };
      tradeStartTimeRef.current = now;

      // If countdown already finished (very fast), show immediately
      if (countdownDisplayRef.current <= 0) {
        setTradeResult(precomputed);
        setTradePhase('result');
        toast.success(isWin ? `Trade Won! +${formatNaira(profit)}` : 'Trade Lost');
        setTrading(false);
        refreshWallets();
        fetchHistory();
      } else {
        // Start countdown, return to normal UI after 1.5s
        startCountdown(duration);
        setTimeout(() => {
          if (tradingRef.current) setTradePhase('idle');
        }, 1500);
        pendingTradeResult.current = precomputed;
      }
    } catch (err: any) {
      stopCountdown();
      pendingTradeResult.current = null;
      monitorInfoRef.current = null;
      setTrading(false);
      tradingRef.current = false;
      setTradePhase('idle');
      toast.error(err.message || 'Trade failed');
    }
  };

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter((t) => t.result === historyFilter);

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-strong rounded-lg p-2 text-xs border border-white/10">
          <p className="text-muted-foreground">{payload[0].payload.time}</p>
          <p className="font-semibold text-gold">{formatNaira(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const priceChange = prevPrice !== null && currentPrice !== null
    ? currentPrice - prevPrice
    : 0;
  const priceUp = priceChange >= 0;

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
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Price Chart */}
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
                  <Tooltip content={<CustomTooltip />} />
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

        {/* Current Price Display */}
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

        {/* ═══════ Place Trade Panel ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 space-y-5"
        >
          <h2 className="font-semibold text-sm">Place Trade</h2>

          {/* 1. Select Wallet — Dropdown */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select Wallet</p>
            <Select
              value={selectedWallet}
              onValueChange={(v) => setSelectedWallet(v as WalletType)}
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
                whileTap={{ scale: 0.97 }}
                onClick={() => setPrediction(prediction === 'UP' ? null : 'UP')}
                className={`rounded-lg p-2.5 flex items-center gap-2 transition-all border-2 ${
                  prediction === 'UP'
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'glass border-transparent hover:border-emerald-500/20'
                }`}
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
                whileTap={{ scale: 0.97 }}
                onClick={() => setPrediction(prediction === 'DOWN' ? null : 'DOWN')}
                className={`rounded-lg p-2.5 flex items-center gap-2 transition-all border-2 ${
                  prediction === 'DOWN'
                    ? 'bg-red-500/15 border-red-500/50'
                    : 'glass border-transparent hover:border-red-500/20'
                }`}
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
              />
              <button
                type="button"
                onClick={() => setTradeAmount(availableBalance.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-medium text-gold bg-gold/10 hover:bg-gold/20 transition-colors"
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
            disabled={!prediction || amountNum <= 0 || amountNum > availableBalance || trading}
            className="w-full gradient-gold text-gold-foreground font-bold h-13 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!prediction || amountNum <= 0 ? (
              'Select Prediction & Amount'
            ) : amountNum > availableBalance ? (
              'Insufficient Balance'
            ) : trading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Trading...
              </span>
            ) : (
              `Place Trade \u2014 ${formatNaira(amountNum)}`
            )}
          </Button>
        </motion.div>

        {/* ═══════ PHASE 1: Trade Successfully Placed ═══════ */}
        <AnimatePresence>
          {tradePhase === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold mb-2"
                >
                  Trade Successfully Placed
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground mb-5"
                >
                  Your prediction has been recorded.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 text-gold text-sm font-medium"
                >
                  <Clock className="w-4 h-4" />
                  <span>Trade running in background...</span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ Floating Trade-In-Progress Indicator ═══════ */}
        <AnimatePresence>
          {trading && tradingRef.current && tradePhase === 'idle' && monitorInfoRef.current && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-4 right-4 z-40 max-w-2xl mx-auto"
            >
              <div className="glass-strong rounded-xl p-3 flex items-center justify-between border border-gold/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/15 border border-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">Trade in Progress</p>
                    <p className="text-[10px] text-muted-foreground">
                      {monitorInfoRef.current.prediction === 'UP' ? 'BUY' : 'SELL'} · {formatNaira(monitorInfoRef.current.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${
                      monitorInfoRef.current.prediction === 'UP' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatCountdown(Math.max(0, countdownDisplayRef.current))}
                    </p>
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        monitorInfoRef.current.prediction === 'UP' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, ((monitorInfoRef.current.duration - Math.max(0, countdownDisplayRef.current)) / monitorInfoRef.current.duration) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ═══════ PHASE 4: Trade Result ═══════ */}
        <AnimatePresence>
          {tradePhase === 'result' && tradeResult && (
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
                  tradeResult.win ? 'border-emerald-500/30' : 'border-red-500/30'
                }`}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    tradeResult.win ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}
                >
                  {tradeResult.win ? (
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
                    tradeResult.win ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tradeResult.win ? 'Congratulations! You Won!' : 'Trade Lost'}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground mb-4"
                >
                  {tradeResult.message}
                </motion.p>

                {tradeResult.win ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass rounded-lg p-3 text-sm space-y-1.5 mb-4"
                  >
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment</span>
                      <span className="font-medium">{formatNaira(tradeResult.amount ?? amountNum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multiplier</span>
                      <span className="font-medium text-gold">{(tradeResult.multiplier ?? 1).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Return</span>
                      <span className="font-medium text-emerald-400">{formatNaira(tradeResult.totalReturn)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-1.5 flex justify-between">
                      <span className="text-muted-foreground font-medium">Profit</span>
                      <span className="font-bold text-emerald-400">+{formatNaira(tradeResult.profit)}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl font-bold font-mono mb-4 text-red-400"
                  >
                    -{formatNaira(tradeResult.amount ?? amountNum)}
                  </motion.div>
                )}

                {/* Trade ID */}
                {monitorInfoRef.current && (
                  <p className="text-[10px] text-muted-foreground tracking-wider mb-4">
                    Trade #{monitorInfoRef.current.tradeId}
                  </p>
                )}

                <Button
                  onClick={() => {
                    if (resultAutoReturnRef.current) { clearTimeout(resultAutoReturnRef.current); resultAutoReturnRef.current = null; }
                    setTradeResult(null);
                    setTradePhase('idle');
                    monitorInfoRef.current = null;
                  }}
                  className={`w-full font-semibold h-11 ${
                    tradeResult.win
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  }`}
                >
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trade History */}
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
