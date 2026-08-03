import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const points = 50;
    let price = 50 + Math.random() * 50; // Start between 50-100
    const prices: { time: string; price: number }[] = [];
    const now = Date.now();

    for (let i = points; i >= 0; i--) {
      const time = new Date(now - i * 60000); // 1 minute intervals
      // Random walk with slight upward bias
      const change = (Math.random() - 0.48) * 3;
      price = Math.max(1, price + change);
      prices.push({
        time: time.toISOString(),
        price: Math.round(price * 100) / 100,
      });
    }

    const currentPrice = prices[prices.length - 1].price;
    const prevPrice = prices[prices.length - 2].price;
    const change = currentPrice - prevPrice;
    const changePercent = (change / prevPrice) * 100;

    return NextResponse.json({
      currentPrice,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
      prices,
    });
  } catch (error: unknown) {
    console.error('Price error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch price data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
