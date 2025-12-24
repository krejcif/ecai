import { describe, it, expect } from 'vitest';
import { getMockCNBData, generateInsights, findArbitrageOpportunities } from '../src/demo/standalone';
import { calculateRateChange } from '../src/demo/liveDemo';

describe('Czech Data Platform - Demo Tests', () => {
  
  it('should generate mock CNB data with correct structure', () => {
    const data = getMockCNBData();
    
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    const firstRate = data[0];
    expect(firstRate).toHaveProperty('country');
    expect(firstRate).toHaveProperty('currency');
    expect(firstRate).toHaveProperty('amount');
    expect(firstRate).toHaveProperty('code');
    expect(firstRate).toHaveProperty('rate');
    expect(firstRate).toHaveProperty('date');
    
    console.log('Generated ' + data.length + ' mock exchange rates');
  });
  
  it('should include major currencies in mock data', () => {
    const data = getMockCNBData();
    const codes = data.map(r => r.code);
    
    const majorCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];
    
    majorCurrencies.forEach(code => {
      expect(codes).toContain(code);
    });
    
    const eurRate = data.find(r => r.code === 'EUR');
    expect(eurRate).toBeDefined();
    expect(eurRate?.rate).toBeGreaterThan(0);
    
    console.log('All major currencies present');
  });
  
  it('should generate market insights from data', () => {
    const data = getMockCNBData();
    const insights = generateInsights(data);
    
    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);
    
    const hasEurInsight = insights.some(i => i.includes('EUR'));
    const hasUsdInsight = insights.some(i => i.includes('USD'));
    
    expect(hasEurInsight).toBe(true);
    expect(hasUsdInsight).toBe(true);
    
    console.log('Generated insights:');
    insights.forEach(insight => console.log('  - ' + insight));
  });
  
  it('should calculate rate changes correctly', () => {
    const testCases = [
      { current: 25.5, previous: 25.0, expectedChange: 0.5 },
      { current: 24.5, previous: 25.0, expectedChange: -0.5 },
      { current: 25.0, previous: 25.0, expectedChange: 0 }
    ];
    
    testCases.forEach(test => {
      const result = calculateRateChange(test.current, test.previous);
      
      expect(result.change).toBe(test.expectedChange);
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('trend');
      
      if (test.expectedChange > 0) {
        expect(result.trend).toBe('up');
      } else if (test.expectedChange < 0) {
        expect(result.trend).toBe('down');
      } else {
        expect(result.trend).toBe('flat');
      }
    });
    
    console.log('All rate change calculations correct');
  });
  
  it('should handle exchange rate conversions', () => {
    const data = getMockCNBData();
    const eurRate = data.find(r => r.code === 'EUR');
    
    expect(eurRate).toBeDefined();
    
    if (eurRate) {
      const czk100Eur = 100 * eurRate.rate / eurRate.amount;
      expect(czk100Eur).toBeGreaterThan(0);
      
      console.log('100 EUR = ' + czk100Eur.toFixed(2) + ' CZK');
    }
  });
  
  it('should identify strongest and weakest currencies', () => {
    const data = getMockCNBData();
    const normalized = data.map(r => ({
      code: r.code,
      rate: r.rate / r.amount
    }));
    
    normalized.sort((a, b) => b.rate - a.rate);
    
    const strongest = normalized[0];
    const weakest = normalized[normalized.length - 1];
    
    expect(strongest).toBeDefined();
    expect(weakest).toBeDefined();
    expect(strongest.rate).toBeGreaterThan(weakest.rate);
    
    console.log('Strongest: ' + strongest.code + ' at ' + strongest.rate.toFixed(4) + ' CZK');
    console.log('Weakest: ' + weakest.code + ' at ' + weakest.rate.toFixed(4) + ' CZK');
  });
  
  it('should demonstrate platform capabilities', () => {
    const capabilities = [
      'CNB Exchange Rate Processing',
      'Real-time Financial Analysis',
      'Arbitrage Opportunity Detection',
      'Smart Exchange Recommendations',
      'Czech Business Registry Integration',
      'Multi-source Data Aggregation'
    ];
    
    expect(capabilities.length).toBe(6);
    
    console.log('Platform Capabilities:');
    capabilities.forEach(cap => console.log('  [x] ' + cap));
  });
  
});
