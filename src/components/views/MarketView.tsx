'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  ArrowUpCircle, ArrowDownCircle, Loader2, AlertCircle,
  Trophy, XCircle, CheckCircle2, Clock, History, Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function formatNaira(amount: number) {
  return `\u20a6${amount.toLocaleString()}`;
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
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
  { label: '2min', value: 120 },
  { label: '5min', value: 300 },
  { label: '10min', value: 600 },
];

const MULTIPLIER_OPTIONS = [
  { label: '1.10x', value: 1.10 },
  { label: '1.20x', value: 1.20 },
  { label: '1.30x', value: 1.30 },
  { label: '1.40x', value: 1.40 },
  { label: '1.50x', value: 1.50 },
];

const WALLET_CONFIG: Record<WalletType, { label: string; icon: typeof Wallet; color: string; balanceKey: 'reward' | 'deposit' | 'profit' }> = {
  reward: { label: 'Reward', icon: Wallet, color: 'text-gold', balanceKey: 'reward' },
  deposit: { label: 'Deposit', icon: PiggyBank, color: 'text-alcoin-blue', balanceKey: 'deposit' },
  profit: { label: 'Profit', icon: TrendingUpIcon, color: 'text-emerald-400', balanceKey: 'profit' },
};

const HISTORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Wins', value: 'win' },
  { label: 'Losses', value: 'loss' },
];

export default function MarketView() {
  const { wallets, setWallets, setView } = useAppStore();

  // Chart data
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trade form
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('deposit');
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [multiplier, setMultiplier] = useState<number>(1.20);

  // Trade execution
  const [trading, setTrading] = useState(false);
  const [tradeCountdown, setTradeCountdown] = useState<number | null>(null);
  const [tradeResult, setTradeResult] = useState<{ win: boolean; profit: number; message: string } | null>(null);

  // History
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all');

  const fetchPrice = useCallback(async () => {
    try {
      const data = await apiFetch('/api/market/price');
      if (data.price !== undefined) {
        setPrevPrice(currentPrice);
        setCurrentPrice(data.price);
        if (data.history && Array.isArray(data.history)) {
          setPriceData(data.history.slice(-60));
        } else if (data.time) {
          setPriceData((prev) => {
            const next = [...prev, { time: data.time, price: data.price, timestamp: Date.now() }];
            return next.slice(-60);
          });
        }
      }
      setChartLoading(false);
    } catch {
      if (chartLoading) setChartLoading(false);
    }
  }, [currentPrice, chartLoading]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await apiFetch('/api/market/history');
      setHistory(data.trades || []);
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

  // Initial fetch
  useEffect(() => {
    fetchPrice();
    fetchHistory();
  }, [fetchPrice, fetchHistory]);

  // Poll price every 2s
  useEffect(() => {
    priceIntervalRef.current = setInterval(fetchPrice, 2000);
    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [fetchPrice]);

  // Trade countdown
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tradeCountdown === null) return;

    countdownRef.current = setInterval(() => {
      setTradeCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [tradeCountdown]);

  const availableBalance = wallets[WALLET_CONFIG[selectedWallet].balanceKey];
  const amountNum = parseFloat(tradeAmount) || 0;
  const estimatedProfit = prediction && amountNum > 0
    ? amountNum * multiplier - amountNum
    : 0;

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
        description: `Your ${WALLET_CONFIG[selectedWallet].label} wallet has ${formatNaira(availableBalance)}`,
      });
      return;
    }

    setTrading(true);
    setTradeResult(null);
    setTradeCountdown(duration);

    try {
      const data = await apiFetch('/api/market/trade', {
        method: 'POST',
        body: JSON.stringify({
          wallet: selectedWallet,
          prediction,
          amount: amountNum,
          duration,
          multiplier,
        }),
      });

      setTradeCountdown(0);

      // Small delay for dramatic effect
      await new Promise((r) => setTimeout(r, 400));

      setTradeResult({
        win: data.result === 'win',
        profit: data.profit || 0,
        message: data.message || (data.result === 'win' ? 'Trade successful!' : 'Better luck next time.'),
      });

      toast.success(
        data.result === 'win'
          ? `Trade Won! +${formatNaira(data.profit || 0)}`
          : `Trade Lost`,
        {
          description: data.message || '',
        }
      );

      refreshWallets();
      fetchHistory();
    } catch (err: any) {
      setTradeCountdown(null);
      toast.error(err.message || 'Trade failed');
    } finally {
      setTrading(false);
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
                <LineChart data={priceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => `₦${v.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={priceUp ? '#10b981' : '#ef4444'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: priceUp ? '#10b981' : '#ef4444', strokeWidth: 0 }}
                  />
                  <ReferenceLine
                    y={priceData.length > 0 ? priceData[priceData.length - 1]?.price : undefined}
                    stroke="rgba(212, 175, 55, 0.2)"
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Current Price */}
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
              {priceUp ? '▲' : '▼'} {priceUp ? '+' : ''}{formatNaira(Math.abs(priceChange))}
            </p>
          )}
        </motion.div>

        {/* Trade Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 space-y-4"
        >
          <h2 className="font-semibold text-sm">Place Trade</h2>

          {/* Wallet Selector */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select Wallet</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(WALLET_CONFIG) as WalletType[]).map((key) => {
                const cfg = WALLET_CONFIG[key];
                const isSelected = selectedWallet === key;
                const bal = wallets[cfg.balanceKey];

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedWallet(key)}
                    className={`rounded-xl p-3 text-center transition-all border ${
                      isSelected
                        ? 'glass-strong border-gold/40 gold-glow'
                        : 'glass border-transparent hover:border-white/10'
                    }`}
                  >
                    <cfg.icon className={`w-4 h-4 mx-auto mb-1 ${cfg.color}`} />
                    <p className={`text-xs font-medium ${isSelected ? cfg.color : 'text-muted-foreground'}`}>
                      {cfg.label}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 ${isSelected ? cfg.color : 'text-foreground'}`}>
                      {formatNaira(bal)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prediction */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Prediction</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setPrediction(prediction === 'UP' ? null : 'UP')}
                className={`rounded-xl p-4 flex flex-col items-center gap-2 transition-all border-2 min-h-[72px] ${
                  prediction === 'UP'
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'glass border-transparent hover:border-emerald-500/20'
                }`}
              >
                <ArrowUpCircle className={`w-7 h-7 ${prediction === 'UP' ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${prediction === 'UP' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  BUY (UP)
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setPrediction(prediction === 'DOWN' ? null : 'DOWN')}
                className={`rounded-xl p-4 flex flex-col items-center gap-2 transition-all border-2 min-h-[72px] ${
                  prediction === 'DOWN'
                    ? 'bg-red-500/15 border-red-500/50'
                    : 'glass border-transparent hover:border-red-500/20'
                }`}
              >
                <ArrowDownCircle className={`w-7 h-7 ${prediction === 'DOWN' ? 'text-red-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${prediction === 'DOWN' ? 'text-red-400' : 'text-muted-foreground'}`}>
                  SELL (DOWN)
                </span>
              </motion.button>
            </div>
          </div>

          {/* Investment Amount */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Investment Amount</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                ₦
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
            {/* Quick amounts */}
            <div className="flex gap-2">
              {[100, 500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTradeAmount(amt.toString())}
                  className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                >
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Multiplier Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Duration</p>
              <Select
                value={duration.toString()}
                onValueChange={(v) => setDuration(parseInt(v))}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 focus:border-gold h-11">
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

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Multiplier</p>
              <Select
                value={multiplier.toString()}
                onValueChange={(v) => setMultiplier(parseFloat(v))}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 focus:border-gold h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10">
                  {MULTIPLIER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trade Summary */}
          {prediction && amountNum > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass-strong rounded-lg p-3 space-y-2"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Trade Summary
              </p>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Prediction</span>
                <span className={`font-medium text-right ${prediction === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {prediction === 'UP' ? 'BUY (UP)' : 'SELL (DOWN)'}
                </span>
                <span className="text-muted-foreground">Investment</span>
                <span className="font-medium text-right">{formatNaira(amountNum)}</span>
                <span className="text-muted-foreground">Multiplier</span>
                <span className="font-medium text-right">{multiplier.toFixed(2)}x</span>
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-right">
                  {DURATION_OPTIONS.find((d) => d.value === duration)?.label || `${duration}s`}
                </span>
                <span className="text-muted-foreground">Potential Profit</span>
                <span className="font-bold text-right text-emerald-400">
                  +{formatNaira(estimatedProfit)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Confirm Trade */}
          <Button
            onClick={handleTrade}
            disabled={!prediction || amountNum <= 0 || amountNum > availableBalance || trading}
            className="w-full gradient-gold text-gold-foreground font-bold h-12 text-base disabled:opacity-40 disabled:cursor-not-allowed"
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
              `Confirm ${prediction === 'UP' ? 'BUY' : 'SELL'} Trade — ${formatNaira(amountNum)}`
            )}
          </Button>
        </motion.div>

        {/* Trading Overlay */}
        <AnimatePresence>
          {trading && tradeCountdown !== null && !tradeResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center"
              >
                <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  prediction === 'UP' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                }`}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className={`w-20 h-20 rounded-full border-4 border-t-transparent ${
                      prediction === 'UP' ? 'border-emerald-500/60' : 'border-red-500/60'
                    }`}
                  />
                  {prediction === 'UP' ? (
                    <ArrowUpCircle className={`w-10 h-10 text-emerald-400 absolute`} />
                  ) : (
                    <ArrowDownCircle className={`w-10 h-10 text-red-400 absolute`} />
                  )}
                </div>

                <h3 className="text-xl font-bold mb-1">
                  Trade in Progress
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Waiting for {DURATION_OPTIONS.find((d) => d.value === duration)?.label || `${duration}s`} to complete...
                </p>

                <div className="text-6xl font-bold font-mono mb-4">
                  <span className={prediction === 'UP' ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCountdown(tradeCountdown)}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      prediction === 'UP' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    initial={{ width: '0%' }}
                    animate={{
                      width: `${((duration - tradeCountdown) / duration) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="mt-4 glass rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{formatNaira(amountNum)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Multiplier</span>
                    <span className="font-semibold">{multiplier.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Potential</span>
                    <span className="font-semibold text-emerald-400">+{formatNaira(estimatedProfit)}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trade Result Overlay */}
        <AnimatePresence>
          {tradeResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setTradeResult(null)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`glass-strong rounded-2xl p-8 max-w-sm w-full text-center border ${
                  tradeResult.win ? 'border-emerald-500/30' : 'border-red-500/30'
                }`}
                onClick={(e) => e.stopPropagation()}
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
                  {tradeResult.win ? 'You Won!' : 'You Lost'}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground mb-4"
                >
                  {tradeResult.message}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-4xl font-bold font-mono mb-6 ${
                    tradeResult.win ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tradeResult.win ? '+' : ''}{formatNaira(tradeResult.profit)}
                </motion.div>

                <Button
                  onClick={() => setTradeResult(null)}
                  className={`w-full font-semibold h-11 ${
                    tradeResult.win
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
                  {filteredHistory.map((trade, i) => (
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
                        {trade.multiplier.toFixed(2)}x
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
