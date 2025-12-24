import axios from 'axios';

interface ExchangeRate {
  country: string;
  currency: string;
  amount: number;
  code: string;
  rate: number;
}

interface CNBData {
  date: string;
  rates: ExchangeRate[];
}

async function fetchCNBRates(date?: string): Promise<CNBData> {
  const url = 'https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/central-bank-exchange-rate-fixing/daily.txt';

  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CzechDataPlatform/1.0)',
        'Accept': 'text/plain'
      }
    });
    const lines = response.data.split('\n');
    
    const dateLine = lines[0];
    const dateMatch = dateLine.match(/(\d{2}\s+\w+\s+\d{4})/);
    const rateDate = dateMatch ? dateMatch[1] : 'Unknown';
    
    const rates: ExchangeRate[] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('|');
      if (parts.length === 5) {
        rates.push({
          country: parts[0],
          currency: parts[1],
          amount: parseInt(parts[2]),
          code: parts[3],
          rate: parseFloat(parts[4])
        });
      }
    }
    
    return { date: rateDate, rates };
  } catch (error) {
    throw new Error('Failed to fetch CNB rates: ' + error);
  }
}

function calculateRateChange(current: number, previous: number): { change: number; percentage: string; trend: string } {
  const change = current - previous;
  const percentage = ((change / previous) * 100).toFixed(2);
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  
  return { change, percentage, trend };
}

function generateInsights(rates: ExchangeRate[]): string[] {
  const insights: string[] = [];
  
  const eur = rates.find(r => r.code === 'EUR');
  const usd = rates.find(r => r.code === 'USD');
  
  if (eur) {
    const strength = eur.rate > 25 ? 'strong' : eur.rate < 24 ? 'weak' : 'stable';
    insights.push('EUR: Euro is ' + strength + ' against CZK (' + eur.rate.toFixed(2) + ' CZK/EUR)');
  }
  
  if (usd) {
    const strength = usd.rate > 23 ? 'strong' : usd.rate < 22 ? 'weak' : 'stable';
    insights.push('USD: Dollar is ' + strength + ' against CZK (' + usd.rate.toFixed(2) + ' CZK/USD)');
  }
  
  if (eur && usd) {
    const eurUsdCross = eur.rate / usd.rate;
    insights.push('EUR/USD cross rate: ' + eurUsdCross.toFixed(4));
  }
  
  const sortedByRate = [...rates].sort((a, b) => (b.rate / b.amount) - (a.rate / a.amount));
  const strongest = sortedByRate[0];
  const weakest = sortedByRate[sortedByRate.length - 1];
  
  insights.push('Strongest: ' + strongest.code + ' (' + (strongest.rate / strongest.amount).toFixed(2) + ' CZK)');
  insights.push('Weakest: ' + weakest.code + ' (' + (weakest.rate / weakest.amount).toFixed(2) + ' CZK)');
  
  return insights;
}

async function main() {
  console.log('CZECH DATA PLATFORM - LIVE DEMO');
  console.log('============================================================');
  console.log('');
  
  try {
    console.log('Fetching real-time CNB exchange rates...');
    const currentData = await fetchCNBRates();
    
    console.log('\nDate: ' + currentData.date);
    console.log('Total currencies tracked: ' + currentData.rates.length);
    console.log('');
    
    console.log('MAJOR CURRENCIES:');
    console.log('------------------------------------------------------------');
    
    const majorCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'PLN'];
    
    for (const code of majorCurrencies) {
      const rate = currentData.rates.find(r => r.code === code);
      if (rate) {
        const unitRate = rate.rate / rate.amount;
        console.log(code.padEnd(5) + ' | ' + rate.currency.padEnd(20) + ' | ' + unitRate.toFixed(4) + ' CZK');
      }
    }
    
    console.log('');
    console.log('MARKET INSIGHTS:');
    console.log('------------------------------------------------------------');
    
    const insights = generateInsights(currentData.rates);
    insights.forEach(insight => console.log(insight));
    
    console.log('');
    console.log('SUCCESS - Real Czech data fetched and processed!');
    console.log('Timestamp: ' + new Date().toISOString());
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

export { fetchCNBRates, calculateRateChange, generateInsights, ExchangeRate, CNBData };

if (require.main === module) {
  main();
}
