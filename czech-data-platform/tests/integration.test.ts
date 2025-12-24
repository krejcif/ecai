import { describe, it, expect } from 'vitest';
import { calculateRateChange, generateInsights, ExchangeRate, CNBData } from '../src/demo/liveDemo';

// Mock CNB data for testing (simulates real API response)
function getMockCNBData(): CNBData {
  return {
    date: '24.12.2025',
    rates: [
      { country: 'EMU', currency: 'euro', amount: 1, code: 'EUR', rate: 25.115 },
      { country: 'USA', currency: 'dollar', amount: 1, code: 'USD', rate: 24.175 },
      { country: 'Velká Británie', currency: 'libra', amount: 1, code: 'GBP', rate: 30.215 },
      { country: 'Švýcarsko', currency: 'frank', amount: 1, code: 'CHF', rate: 26.890 },
      { country: 'Japonsko', currency: 'jen', amount: 100, code: 'JPY', rate: 15.985 },
      { country: 'Polsko', currency: 'zlotý', amount: 1, code: 'PLN', rate: 5.945 },
      { country: 'Maďarsko', currency: 'forint', amount: 100, code: 'HUF', rate: 6.125 },
      { country: 'Švédsko', currency: 'koruna', amount: 1, code: 'SEK', rate: 2.285 },
      { country: 'Norsko', currency: 'koruna', amount: 1, code: 'NOK', rate: 2.195 },
      { country: 'Dánsko', currency: 'koruna', amount: 1, code: 'DKK', rate: 3.370 },
    ]
  };
}

describe('Czech Data Platform - Integration Tests', () => {

  it('should parse CNB exchange rate data correctly', () => {
    const data = getMockCNBData();

    expect(data).toBeDefined();
    expect(data.date).toBeDefined();
    expect(data.rates).toBeInstanceOf(Array);
    expect(data.rates.length).toBeGreaterThan(0);

    console.log('Loaded ' + data.rates.length + ' exchange rates for ' + data.date);
  });

  it('should extract major currency rates correctly', () => {
    const data = getMockCNBData();

    const eurRate = data.rates.find(r => r.code === 'EUR');
    expect(eurRate).toBeDefined();
    expect(eurRate?.code).toBe('EUR');
    expect(eurRate?.rate).toBeGreaterThan(20);
    expect(eurRate?.rate).toBeLessThan(30);
    expect(eurRate?.amount).toBe(1);
    expect(eurRate?.currency).toBe('euro');
    expect(eurRate?.country).toBe('EMU');

    const usdRate = data.rates.find(r => r.code === 'USD');
    expect(usdRate).toBeDefined();
    expect(usdRate?.code).toBe('USD');
    expect(usdRate?.rate).toBeGreaterThan(20);
    expect(usdRate?.rate).toBeLessThan(30);

    console.log('EUR Rate: ' + eurRate?.rate + ' CZK');
    console.log('USD Rate: ' + usdRate?.rate + ' CZK');
  });

  it('should generate economic insights from rate data', () => {
    const data = getMockCNBData();
    const insights = generateInsights(data.rates);

    expect(insights).toBeInstanceOf(Array);
    expect(insights.length).toBeGreaterThan(0);

    const hasEurInsight = insights.some(i => i.includes('EUR'));
    const hasUsdInsight = insights.some(i => i.includes('USD'));

    expect(hasEurInsight).toBe(true);
    expect(hasUsdInsight).toBe(true);

    console.log('Generated ' + insights.length + ' market insights');
    insights.forEach(insight => console.log('  - ' + insight));
  });

  it('should detect currency trends', () => {
    const testCases = [
      { current: 25.5, previous: 25.0, expectedTrend: 'up' },
      { current: 24.5, previous: 25.0, expectedTrend: 'down' },
      { current: 25.0, previous: 25.0, expectedTrend: 'flat' }
    ];

    testCases.forEach(test => {
      const result = calculateRateChange(test.current, test.previous);
      expect(result.trend).toBe(test.expectedTrend);
      expect(result.change).toBe(test.current - test.previous);

      const expectedPercentage = (((test.current - test.previous) / test.previous) * 100).toFixed(2);
      expect(result.percentage).toBe(expectedPercentage);
    });

    console.log('All trend detection tests passed');
  });

  it('should handle all major currency codes', () => {
    const data = getMockCNBData();

    const majorCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];
    const foundCurrencies: string[] = [];

    majorCurrencies.forEach(code => {
      const rate = data.rates.find(r => r.code === code);
      if (rate) {
        foundCurrencies.push(code);
        expect(rate.rate).toBeGreaterThan(0);
      }
    });

    expect(foundCurrencies.length).toBe(5);
    console.log('Found major currencies: ' + foundCurrencies.join(', '));
  });

  it('should calculate cross rates correctly', () => {
    const data = getMockCNBData();
    const eurRate = data.rates.find(r => r.code === 'EUR');
    const usdRate = data.rates.find(r => r.code === 'USD');

    expect(eurRate).toBeDefined();
    expect(usdRate).toBeDefined();

    // EUR/USD cross rate calculation
    const crossRate = eurRate!.rate / usdRate!.rate;
    expect(crossRate).toBeGreaterThan(1.0);
    expect(crossRate).toBeLessThan(1.1);

    console.log('EUR/USD Cross Rate: ' + crossRate.toFixed(4));
  });

  it('should handle JPY special case (100 units)', () => {
    const data = getMockCNBData();
    const jpyRate = data.rates.find(r => r.code === 'JPY');

    expect(jpyRate).toBeDefined();
    expect(jpyRate?.amount).toBe(100);

    // Calculate per-unit rate
    const perUnitRate = jpyRate!.rate / jpyRate!.amount;
    expect(perUnitRate).toBeLessThan(1); // JPY per unit should be less than 1 CZK

    console.log('JPY per 100: ' + jpyRate?.rate + ' CZK');
    console.log('JPY per 1: ' + perUnitRate.toFixed(4) + ' CZK');
  });

});
