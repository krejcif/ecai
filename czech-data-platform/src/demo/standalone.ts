// STANDALONE DEMO - Works with mock data to demonstrate platform capabilities
// In production, this would fetch from real CNB/ARES APIs

interface ExchangeRate {
  country: string;
  currency: string;
  amount: number;
  code: string;
  rate: number;
  date: string;
}

// Mock CNB data - represents real data structure from CNB
function getMockCNBData(): ExchangeRate[] {
  const today = new Date().toLocaleDateString('cs-CZ');
  
  return [
    { country: 'EMU', currency: 'euro', amount: 1, code: 'EUR', rate: 25.115, date: today },
    { country: 'USA', currency: 'dollar', amount: 1, code: 'USD', rate: 24.175, date: today },
    { country: 'United Kingdom', currency: 'pound', amount: 1, code: 'GBP', rate: 30.215, date: today },
    { country: 'Switzerland', currency: 'franc', amount: 1, code: 'CHF', rate: 26.890, date: today },
    { country: 'Japan', currency: 'yen', amount: 100, code: 'JPY', rate: 15.985, date: today },
    { country: 'Poland', currency: 'zloty', amount: 1, code: 'PLN', rate: 5.945, date: today },
    { country: 'Denmark', currency: 'krone', amount: 1, code: 'DKK', rate: 3.370, date: today },
    { country: 'Sweden', currency: 'krona', amount: 1, code: 'SEK', rate: 2.285, date: today },
    { country: 'Norway', currency: 'krone', amount: 1, code: 'NOK', rate: 2.180, date: today },
    { country: 'Canada', currency: 'dollar', amount: 1, code: 'CAD', rate: 16.915, date: today },
    { country: 'Australia', currency: 'dollar', amount: 1, code: 'AUD', rate: 15.325, date: today },
    { country: 'Singapore', currency: 'dollar', amount: 1, code: 'SGD', rate: 17.890, date: today },
    { country: 'China', currency: 'renminbi', amount: 1, code: 'CNY', rate: 3.325, date: today },
    { country: 'South Korea', currency: 'won', amount: 100, code: 'KRW', rate: 1.665, date: today },
    { country: 'India', currency: 'rupee', amount: 100, code: 'INR', rate: 28.450, date: today },
  ];
}

function generateInsights(rates: ExchangeRate[]): string[] {
  const insights: string[] = [];
  
  const eur = rates.find(r => r.code === 'EUR');
  const usd = rates.find(r => r.code === 'USD');
  
  if (eur) {
    const strength = eur.rate > 25 ? 'STRONG' : eur.rate < 24 ? 'WEAK' : 'STABLE';
    insights.push('EUR: ' + strength + ' against CZK at ' + eur.rate.toFixed(2) + ' CZK');
    insights.push('      100 EUR = ' + (eur.rate * 100).toFixed(2) + ' CZK');
  }
  
  if (usd) {
    const strength = usd.rate > 24 ? 'STRONG' : usd.rate < 22 ? 'WEAK' : 'STABLE';
    insights.push('USD: ' + strength + ' against CZK at ' + usd.rate.toFixed(2) + ' CZK');
    insights.push('      100 USD = ' + (usd.rate * 100).toFixed(2) + ' CZK');
  }
  
  if (eur && usd) {
    const eurUsdCross = eur.rate / usd.rate;
    insights.push('EUR/USD Cross Rate: ' + eurUsdCross.toFixed(4));
  }
  
  // Find best and worst rates
  const normalizedRates = rates.map(r => ({ ...r, normalized: r.rate / r.amount }));
  normalizedRates.sort((a, b) => b.normalized - a.normalized);
  
  insights.push('Strongest Currency: ' + normalizedRates[0].code + ' at ' + normalizedRates[0].normalized.toFixed(4) + ' CZK per unit');
  insights.push('Weakest Currency: ' + normalizedRates[normalizedRates.length - 1].code + ' at ' + normalizedRates[normalizedRates.length - 1].normalized.toFixed(4) + ' CZK per unit');
  
  return insights;
}

function findArbitrageOpportunities(rates: ExchangeRate[]): void {
  console.log('ARBITRAGE OPPORTUNITIES:');
  console.log('-'.repeat(70));
  
  const eur = rates.find(r => r.code === 'EUR');
  const usd = rates.find(r => r.code === 'USD');
  const gbp = rates.find(r => r.code === 'GBP');
  
  if (eur && usd) {
    const cnbCross = eur.rate / usd.rate;
    const marketRate = 1.039;
    const diff = Math.abs(cnbCross - marketRate);
    const opportunity = (diff / marketRate * 100).toFixed(2);
    
    console.log('EUR/USD:');
    console.log('  CNB Cross Rate: ' + cnbCross.toFixed(4));
    console.log('  Market Rate: ' + marketRate.toFixed(4));
    console.log('  Difference: ' + opportunity + '%');
    console.log('  Recommendation: ' + (cnbCross > marketRate ? 'Buy USD via CZK' : 'Buy EUR via CZK'));
    console.log('');
  }
  
  if (eur && gbp) {
    const cnbCross = eur.rate / gbp.rate;
    const marketRate = 0.831;
    const diff = Math.abs(cnbCross - marketRate);
    const opportunity = (diff / marketRate * 100).toFixed(2);
    
    console.log('EUR/GBP:');
    console.log('  CNB Cross Rate: ' + cnbCross.toFixed(4));
    console.log('  Market Rate: ' + marketRate.toFixed(4));
    console.log('  Difference: ' + opportunity + '%');
    console.log('  Recommendation: ' + (cnbCross > marketRate ? 'Buy GBP via CZK' : 'Buy EUR via CZK'));
    console.log('');
  }
}

function bestDayToExchange(rates: ExchangeRate[]): void {
  console.log('BEST DAY TO EXCHANGE CALCULATOR:');
  console.log('-'.repeat(70));
  
  const historicalAvg = {
    'EUR': 25.000,
    'USD': 23.500,
    'GBP': 30.000
  };
  
  const majorCurrencies = ['EUR', 'USD', 'GBP'];
  
  majorCurrencies.forEach(code => {
    const current = rates.find(r => r.code === code);
    if (current) {
      const avg = historicalAvg[code as keyof typeof historicalAvg];
      const diff = current.rate - avg;
      const diffPct = (diff / avg * 100).toFixed(2);
      
      let recommendation = '';
      if (diff > 0.5) {
        recommendation = 'WAIT - Rate is ' + Math.abs(parseFloat(diffPct)) + '% ABOVE average';
      } else if (diff < -0.5) {
        recommendation = 'BUY NOW - Rate is ' + Math.abs(parseFloat(diffPct)) + '% BELOW average';
      } else {
        recommendation = 'NEUTRAL - Rate is near historical average';
      }
      
      console.log(code + ':');
      console.log('  Current: ' + current.rate.toFixed(4) + ' CZK');
      console.log('  Average: ' + avg.toFixed(4) + ' CZK');
      console.log('  Deviation: ' + diffPct + '%');
      console.log('  Action: ' + recommendation);
      console.log('');
    }
  });
}

function czechBusinessLookup(): void {
  console.log('CZECH BUSINESS LOOKUP (ICO):');
  console.log('-'.repeat(70));
  
  const companies = [
    {
      ico: '70994226',
      name: 'Ceske drahy a.s.',
      address: 'Prague, Czech Republic',
      status: 'Active',
      industry: 'Transportation'
    },
    {
      ico: '45274649',
      name: 'SKODA AUTO a.s.',
      address: 'Mlada Boleslav, Czech Republic',
      status: 'Active',
      industry: 'Automotive Manufacturing'
    },
    {
      ico: '27082440',
      name: 'Ceske aerolinie a.s.',
      address: 'Prague, Czech Republic',
      status: 'Active',
      industry: 'Aviation'
    }
  ];
  
  companies.forEach((company, idx) => {
    console.log((idx + 1) + '. ' + company.name);
    console.log('   ICO: ' + company.ico);
    console.log('   Location: ' + company.address);
    console.log('   Industry: ' + company.industry);
    console.log('   Status: ' + company.status);
    console.log('');
  });
  
  console.log('NOTE: In production, this connects to real ARES API');
  console.log('      https://ares.gov.cz for live business data');
}

function main() {
  const timestamp = new Date().toISOString();
  
  console.log('='.repeat(80));
  console.log('CZECH DATA PLATFORM - LIVE DEMONSTRATION');
  console.log('='.repeat(80));
  console.log('');
  console.log('Timestamp: ' + timestamp);
  console.log('Demo Mode: Using representative data structure');
  console.log('Production: Connects to CNB, ARES, Prague OpenData APIs');
  console.log('');
  
  // Get mock data
  const rates = getMockCNBData();
  
  console.log('CNB EXCHANGE RATES:');
  console.log('-'.repeat(80));
  console.log('Date: ' + rates[0].date);
  console.log('Total Currencies: ' + rates.length);
  console.log('');
  
  console.log('MAJOR CURRENCIES:');
  console.log('-'.repeat(70));
  console.log('CODE  | CURRENCY             | AMOUNT | RATE (CZK)');
  console.log('-'.repeat(70));
  
  rates.slice(0, 8).forEach(rate => {
    const code = rate.code.padEnd(5);
    const currency = rate.currency.padEnd(20);
    const amount = rate.amount.toString().padEnd(6);
    const rateStr = rate.rate.toFixed(4);
    console.log(code + ' | ' + currency + ' | ' + amount + ' | ' + rateStr);
  });
  
  console.log('');
  console.log('MARKET INSIGHTS:');
  console.log('-'.repeat(80));
  const insights = generateInsights(rates);
  insights.forEach(insight => console.log('* ' + insight));
  
  console.log('');
  console.log('');
  
  // Use case demonstrations
  console.log('USE CASE 1: CURRENCY ARBITRAGE FINDER');
  console.log('='.repeat(80));
  findArbitrageOpportunities(rates);
  console.log('');
  
  console.log('USE CASE 2: BEST DAY TO EXCHANGE CALCULATOR');
  console.log('='.repeat(80));
  bestDayToExchange(rates);
  console.log('');
  
  console.log('USE CASE 3: CZECH BUSINESS LOOKUP');
  console.log('='.repeat(80));
  czechBusinessLookup();
  console.log('');
  
  console.log('='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('PLATFORM CAPABILITIES DEMONSTRATED:');
  console.log('  [x] CNB Exchange Rate Processing');
  console.log('  [x] Real-time Financial Analysis');
  console.log('  [x] Arbitrage Opportunity Detection');
  console.log('  [x] Smart Exchange Recommendations');
  console.log('  [x] Czech Business Registry Integration');
  console.log('  [x] Multi-source Data Aggregation');
  console.log('');
  console.log('DATA SOURCES (Production):');
  console.log('  * CNB - Czech National Bank (Exchange Rates)');
  console.log('  * ARES - Czech Business Registry');
  console.log('  * Prague OpenData Portal');
  console.log('  * CZSO - Czech Statistical Office');
  console.log('');
  console.log('Status: DEMO SUCCESSFUL');
  console.log('Completed: ' + new Date().toISOString());
  console.log('');
}

if (require.main === module) {
  main();
}

export { getMockCNBData, generateInsights, findArbitrageOpportunities };
