import { NextResponse } from 'next/server';

/**
 * Server-side deterministic price generator.
 * Same algorithm as in /api/market/trade and /api/market/settle.
 */
function generateServerPrice(seed: number): number {
  const base = 80;
  const wave = Math.sin(seed / 1000) * 5;
  const noise = Math.sin(seed * 7.13) * 2 + Math.cos(seed * 3.71) * 1.5;
  return Math.max(10, Math.min(200, base + wave + noise));
}

/**
 * GET /api/market/price
 * Returns current server-generated price + server timestamp.
 * Frontend uses serverTime to sync countdowns.
 */
export async function GET() {
  try {
    const now = Date.now();
    const currentPrice = Math.round(generateServerPrice(now) * 100) / 100;

    // Generate recent price history for chart
    const points = 60;
    const prices: { time: string; price: number; timestamp: number }[] = [];
    const intervalMs = 2000;

    for (let i = points; i >= 0; i--) {
      const ts = now - i * intervalMs;
      const price = Math.round(generateServerPrice(ts) * 100) / 100;
      prices.push({
        time: new Date(ts).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        price,
        timestamp: ts,
      });
    }

    const prevPrice = prices.length >= 2 ? prices[prices.length - 2].price : currentPrice;
    const change = currentPrice - prevPrice;
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

    return NextResponse.json({
      currentPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      prices,
      serverTime: new Date(now).toISOString(),
    });
  } catch (error: unknown) {
    console.error('Price error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch price data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
