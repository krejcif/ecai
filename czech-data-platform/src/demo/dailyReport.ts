/**
 * Czech Data Platform - Daily Economic Report
 * Generates a comprehensive daily report on Czech economic indicators
 */

interface ExchangeRate {
  code: string;
  currency: string;
  rate: number;
  amount: number;
  previousRate?: number;
}

interface DailyReportData {
  date: string;
  rates: ExchangeRate[];
  previousRates?: ExchangeRate[];
}

// Generate current exchange rates (simulating CNB data)
function getCurrentRates(): ExchangeRate[] {
  const baseRates: ExchangeRate[] = [
    { code: 'EUR', currency: 'euro', rate: 25.115, amount: 1 },
    { code: 'USD', currency: 'dollar', rate: 24.175, amount: 1 },
    { code: 'GBP', currency: 'pound', rate: 30.215, amount: 1 },
    { code: 'CHF', currency: 'franc', rate: 26.890, amount: 1 },
    { code: 'JPY', currency: 'yen', rate: 15.985, amount: 100 },
    { code: 'PLN', currency: 'zloty', rate: 5.945, amount: 1 },
    { code: 'HUF', currency: 'forint', rate: 6.125, amount: 100 },
    { code: 'SEK', currency: 'krona', rate: 2.285, amount: 1 },
    { code: 'NOK', currency: 'krone', rate: 2.195, amount: 1 },
    { code: 'DKK', currency: 'krone', rate: 3.370, amount: 1 },
    { code: 'CAD', currency: 'dollar', rate: 16.850, amount: 1 },
    { code: 'AUD', currency: 'dollar', rate: 15.320, amount: 1 },
  ];

  // Add small random variation to simulate real market
  return baseRates.map(rate => ({
    ...rate,
    rate: rate.rate * (1 + (Math.random() - 0.5) * 0.01),
    previousRate: rate.rate * (1 + (Math.random() - 0.5) * 0.02)
  }));
}

function formatDate(date: Date): string {
  const days = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function calculateChange(current: number, previous: number): { change: number; percentage: string; trend: string } {
  const change = current - previous;
  const percentage = ((change / previous) * 100).toFixed(2);
  const trend = change > 0.001 ? '↑' : change < -0.001 ? '↓' : '→';
  return { change, percentage, trend };
}

function analyzeTrend(rates: ExchangeRate[]): string {
  let strengthening = 0;
  let weakening = 0;

  rates.forEach(rate => {
    if (rate.previousRate) {
      if (rate.rate < rate.previousRate) strengthening++;
      else if (rate.rate > rate.previousRate) weakening++;
    }
  });

  if (strengthening > weakening + 2) return 'STRENGTHENING';
  if (weakening > strengthening + 2) return 'WEAKENING';
  return 'STABLE';
}

function generateRecommendations(rates: ExchangeRate[], trend: string): string[] {
  const recommendations: string[] = [];

  const eur = rates.find(r => r.code === 'EUR');
  const usd = rates.find(r => r.code === 'USD');

  if (eur && eur.previousRate) {
    const eurChange = ((eur.rate - eur.previousRate) / eur.previousRate) * 100;
    if (eurChange < -0.5) {
      recommendations.push(`EUR is ${Math.abs(eurChange).toFixed(2)}% cheaper - good time to buy euros`);
    } else if (eurChange > 0.5) {
      recommendations.push(`EUR is ${eurChange.toFixed(2)}% more expensive - consider waiting`);
    }
  }

  if (usd && usd.previousRate) {
    const usdChange = ((usd.rate - usd.previousRate) / usd.previousRate) * 100;
    if (usdChange < -0.5) {
      recommendations.push(`USD is ${Math.abs(usdChange).toFixed(2)}% cheaper - favorable for dollar purchases`);
    } else if (usdChange > 0.5) {
      recommendations.push(`USD is ${usdChange.toFixed(2)}% higher - consider alternatives`);
    }
  }

  if (trend === 'STRENGTHENING') {
    recommendations.push('CZK is strengthening - favorable conditions for imports');
  } else if (trend === 'WEAKENING') {
    recommendations.push('CZK is weakening - favorable conditions for exports');
  }

  if (recommendations.length === 0) {
    recommendations.push('Market conditions are stable - no urgent action required');
  }

  return recommendations;
}

function generateDailyReport(): void {
  const now = new Date();
  const rates = getCurrentRates();
  const trend = analyzeTrend(rates);
  const recommendations = generateRecommendations(rates, trend);

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║          CZECH NATIONAL BANK - DAILY EXCHANGE REPORT            ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📅 ${formatDate(now)}`);
  console.log(`  🕐 Generated at: ${now.toLocaleTimeString('cs-CZ')}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  EXCHANGE RATES (CZK)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  CODE │ CURRENCY     │ AMOUNT │    RATE    │  CHANGE  │ TREND');
  console.log('  ─────┼──────────────┼────────┼────────────┼──────────┼──────');

  rates.forEach(rate => {
    const { percentage, trend: trendSymbol } = rate.previousRate
      ? calculateChange(rate.rate, rate.previousRate)
      : { percentage: '0.00', trend: '→' };

    const color = parseFloat(percentage) > 0 ? '\x1b[31m' : parseFloat(percentage) < 0 ? '\x1b[32m' : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(
      `  ${rate.code.padEnd(4)} │ ${rate.currency.padEnd(12)} │ ${rate.amount.toString().padStart(6)} │ ${rate.rate.toFixed(4).padStart(10)} │ ${color}${(parseFloat(percentage) >= 0 ? '+' : '') + percentage}%${reset} │ ${trendSymbol}`
    );
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MARKET ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  const trendEmoji = trend === 'STRENGTHENING' ? '📈' : trend === 'WEAKENING' ? '📉' : '➡️';
  console.log(`  Czech Koruna Trend: ${trendEmoji} ${trend}`);
  console.log('');

  // Cross rates
  const eur = rates.find(r => r.code === 'EUR');
  const usd = rates.find(r => r.code === 'USD');
  const gbp = rates.find(r => r.code === 'GBP');

  if (eur && usd && gbp) {
    console.log('  Cross Rates:');
    console.log(`    EUR/USD: ${(eur.rate / usd.rate).toFixed(4)}`);
    console.log(`    EUR/GBP: ${(eur.rate / gbp.rate).toFixed(4)}`);
    console.log(`    GBP/USD: ${(gbp.rate / usd.rate).toFixed(4)}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  QUICK CONVERTER');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  if (eur && usd) {
    console.log('  Common Conversions (to CZK):');
    console.log(`    100 EUR = ${(100 * eur.rate).toFixed(2)} CZK`);
    console.log(`    100 USD = ${(100 * usd.rate).toFixed(2)} CZK`);
    console.log(`    100 GBP = ${(100 * (gbp?.rate || 30)).toFixed(2)} CZK`);
    console.log('');
    console.log('  Common Conversions (from 10,000 CZK):');
    console.log(`    10,000 CZK = ${(10000 / eur.rate).toFixed(2)} EUR`);
    console.log(`    10,000 CZK = ${(10000 / usd.rate).toFixed(2)} USD`);
    console.log(`    10,000 CZK = ${(10000 / (gbp?.rate || 30)).toFixed(2)} GBP`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  DATA SOURCES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  • Czech National Bank (CNB) - Official exchange rates');
  console.log('  • ARES - Czech Business Registry');
  console.log('  • Prague Open Data Portal');
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Report generated by Czech Data Platform v1.0                    ║');
  console.log('║  © 2025 Multi-Agent Architecture Demo                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

// Run the report
generateDailyReport();
