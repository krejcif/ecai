/**
 * AI Advisor - Intelligent market advisor for Czech economy
 * Provides investment timing, currency exchange recommendations, and NL summaries
 */

import {
  ExchangeRate,
  TrendAnalysis,
  VolatilityPattern,
  RatePrediction
} from './insightEngine';

// ===== TYPES & INTERFACES =====

export interface InvestmentTiming {
  action: 'buy' | 'sell' | 'hold' | 'wait';
  currency: string;
  confidence: number; // 0-1
  reasoning: string[];
  optimalTimeframe: string;
  expectedReturn?: number; // Percentage
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CurrencyExchangeWindow {
  currency: string;
  action: 'exchange_now' | 'wait' | 'exchange_soon';
  urgency: 'low' | 'medium' | 'high';
  currentRate: number;
  targetRate?: number;
  estimatedSavings?: number; // Percentage
  validUntil: Date;
  recommendation: string;
}

export interface MarketSummary {
  timestamp: Date;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  keyInsights: string[];
  narrativeSummary: string;
  topOpportunities: {
    currency: string;
    type: 'exchange' | 'investment' | 'hedging';
    description: string;
    priority: number;
  }[];
  risks: {
    type: 'volatility' | 'trend_reversal' | 'external_factors';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export interface AdvisorContext {
  userProfile?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentHorizon: 'short' | 'medium' | 'long';
    preferredCurrencies: string[];
  };
  marketData: {
    exchangeRates: Map<string, ExchangeRate[]>;
    trends: Map<string, TrendAnalysis>;
    predictions: Map<string, RatePrediction>;
    volatilityPatterns: Map<string, VolatilityPattern>;
  };
}

// ===== CZECH MARKET ADVISOR =====

export class CzechMarketAdvisor {
  private context: AdvisorContext;
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;

  constructor(context: AdvisorContext) {
    this.context = context;
  }

  /**
   * Updates the advisor's market context with new data
   */
  public updateContext(context: Partial<AdvisorContext>): void {
    this.context = {
      ...this.context,
      ...context,
      marketData: {
        ...this.context.marketData,
        ...context.marketData
      }
    };
  }

  /**
   * Provides investment timing suggestions based on CZK exchange rates
   */
  public suggestInvestmentTiming(
    currency: string,
    investmentAmount?: number
  ): InvestmentTiming {
    const prediction = this.context.marketData.predictions.get(currency);
    const trend = this.context.marketData.trends.get(currency);
    const volatility = this.context.marketData.volatilityPatterns.get(currency);

    if (!prediction || !trend || !volatility) {
      throw new Error(`Insufficient data for ${currency} investment analysis`);
    }

    const rates = this.context.marketData.exchangeRates.get(currency);
    if (!rates || rates.length === 0) {
      throw new Error(`No exchange rate data available for ${currency}`);
    }

    const currentRate = rates[rates.length - 1].rate;
    const expectedChange = ((prediction.predictedRate - currentRate) / currentRate) * 100;

    // Determine action based on trend, prediction, and risk tolerance
    const action = this.determineInvestmentAction(
      expectedChange,
      trend,
      volatility,
      prediction.confidence
    );

    // Calculate confidence
    const confidence = this.calculateActionConfidence(
      prediction.confidence,
      trend.confidence,
      volatility.type
    );

    // Generate reasoning
    const reasoning = this.generateInvestmentReasoning(
      currency,
      action,
      expectedChange,
      trend,
      volatility,
      prediction
    );

    // Determine optimal timeframe
    const optimalTimeframe = this.determineTimeframe(trend, volatility, expectedChange);

    // Calculate expected return if applicable
    const expectedReturn = action !== 'hold' ? Math.abs(expectedChange) : undefined;

    // Assess risk level
    const riskLevel = this.assessRiskLevel(volatility, trend, expectedChange);

    return {
      action,
      currency,
      confidence,
      reasoning,
      optimalTimeframe,
      expectedReturn,
      riskLevel
    };
  }

  /**
   * Identifies optimal currency exchange windows
   */
  public identifyExchangeWindows(
    currency: string,
    amount?: number
  ): CurrencyExchangeWindow {
    const prediction = this.context.marketData.predictions.get(currency);
    const trend = this.context.marketData.trends.get(currency);
    const volatility = this.context.marketData.volatilityPatterns.get(currency);

    if (!prediction || !trend) {
      throw new Error(`Insufficient data for ${currency} exchange analysis`);
    }

    const rates = this.context.marketData.exchangeRates.get(currency);
    if (!rates || rates.length === 0) {
      throw new Error(`No exchange rate data available for ${currency}`);
    }

    const currentRate = rates[rates.length - 1].rate;
    const expectedChange = ((prediction.predictedRate - currentRate) / currentRate) * 100;

    // Determine exchange action
    let action: CurrencyExchangeWindow['action'];
    let urgency: CurrencyExchangeWindow['urgency'];

    if (expectedChange < -1 && prediction.confidence > this.CONFIDENCE_THRESHOLD) {
      // Rate expected to worsen - exchange now
      action = 'exchange_now';
      urgency = prediction.confidence > this.HIGH_CONFIDENCE_THRESHOLD ? 'high' : 'medium';
    } else if (expectedChange > 1 && prediction.confidence > this.CONFIDENCE_THRESHOLD) {
      // Rate expected to improve - wait
      action = 'wait';
      urgency = 'low';
    } else if (Math.abs(expectedChange) < 0.5) {
      // Minimal expected change
      action = 'exchange_soon';
      urgency = volatility?.type === 'high' ? 'medium' : 'low';
    } else {
      action = 'wait';
      urgency = 'low';
    }

    // Calculate target rate if waiting
    const targetRate = action === 'wait' ? prediction.predictedRate : undefined;

    // Estimate potential savings
    const estimatedSavings = action === 'wait' ? Math.abs(expectedChange) :
                            action === 'exchange_now' ? Math.abs(expectedChange) : 0;

    // Set validity window
    const validUntil = new Date();
    const horizonDays = prediction.timeHorizon === '24h' ? 1 :
                       prediction.timeHorizon === '7d' ? 7 : 30;
    validUntil.setDate(validUntil.getDate() + horizonDays);

    // Generate recommendation text
    const recommendation = this.generateExchangeRecommendation(
      currency,
      action,
      urgency,
      expectedChange,
      currentRate,
      targetRate,
      amount
    );

    return {
      currency,
      action,
      urgency,
      currentRate,
      targetRate,
      estimatedSavings,
      validUntil,
      recommendation
    };
  }

  /**
   * Generates comprehensive natural language market summary
   */
  public generateMarketSummary(): MarketSummary {
    const timestamp = new Date();

    // Analyze overall market sentiment
    const overallSentiment = this.analyzeOverallSentiment();

    // Generate key insights
    const keyInsights = this.generateKeyInsights();

    // Create narrative summary
    const narrativeSummary = this.createNarrativeSummary(overallSentiment, keyInsights);

    // Identify top opportunities
    const topOpportunities = this.identifyTopOpportunities();

    // Assess risks
    const risks = this.assessMarketRisks();

    return {
      timestamp,
      overallSentiment,
      keyInsights,
      narrativeSummary,
      topOpportunities,
      risks
    };
  }

  /**
   * Generates a conversational market update
   */
  public generateConversationalUpdate(): string {
    const summary = this.generateMarketSummary();
    const lines: string[] = [];

    // Greeting and sentiment
    const greetings = {
      bullish: "Good news from the Czech currency markets today!",
      bearish: "The Czech koruna is facing some challenges today.",
      neutral: "Czech currency markets are showing stable conditions today."
    };

    lines.push(greetings[summary.overallSentiment]);
    lines.push('');

    // Narrative summary
    lines.push(summary.narrativeSummary);
    lines.push('');

    // Key insights with conversational tone
    if (summary.keyInsights.length > 0) {
      lines.push("Here's what you need to know:");
      summary.keyInsights.forEach((insight, i) => {
        lines.push(`${i + 1}. ${insight}`);
      });
      lines.push('');
    }

    // Opportunities
    if (summary.topOpportunities.length > 0) {
      lines.push('Opportunities to watch:');
      summary.topOpportunities.slice(0, 3).forEach(opp => {
        lines.push(`• ${opp.description}`);
      });
      lines.push('');
    }

    // Risks
    if (summary.risks.length > 0) {
      const highRisks = summary.risks.filter(r => r.severity === 'high');
      if (highRisks.length > 0) {
        lines.push('Important risks to consider:');
        highRisks.forEach(risk => {
          lines.push(`⚠️  ${risk.description}`);
        });
        lines.push('');
      }
    }

    // Closing advice
    const closingAdvice = this.generateClosingAdvice(summary);
    lines.push(closingAdvice);

    return lines.join('\n');
  }

  // ===== PRIVATE HELPER METHODS =====

  private determineInvestmentAction(
    expectedChange: number,
    trend: TrendAnalysis,
    volatility: VolatilityPattern,
    predictionConfidence: number
  ): InvestmentTiming['action'] {
    const riskTolerance = this.context.userProfile?.riskTolerance || 'moderate';

    // High volatility - be cautious
    if (volatility.type === 'high') {
      if (riskTolerance === 'conservative') {
        return 'hold';
      }
    }

    // Strong bearish prediction
    if (expectedChange < -2 && predictionConfidence > this.CONFIDENCE_THRESHOLD) {
      return trend.direction === 'bearish' ? 'sell' : 'hold';
    }

    // Strong bullish prediction
    if (expectedChange > 2 && predictionConfidence > this.CONFIDENCE_THRESHOLD) {
      return trend.direction === 'bullish' ? 'buy' : 'wait';
    }

    // Moderate prediction
    if (Math.abs(expectedChange) > 1 && predictionConfidence > this.CONFIDENCE_THRESHOLD) {
      return expectedChange > 0 ? 'buy' : 'sell';
    }

    return 'hold';
  }

  private calculateActionConfidence(
    predictionConfidence: number,
    trendConfidence: number,
    volatilityType: 'low' | 'medium' | 'high'
  ): number {
    const volatilityFactor = volatilityType === 'low' ? 1 :
                            volatilityType === 'medium' ? 0.85 : 0.7;

    return (predictionConfidence * 0.6 + trendConfidence * 0.4) * volatilityFactor;
  }

  private generateInvestmentReasoning(
    currency: string,
    action: string,
    expectedChange: number,
    trend: TrendAnalysis,
    volatility: VolatilityPattern,
    prediction: RatePrediction
  ): string[] {
    const reasoning: string[] = [];

    // Action justification
    if (action === 'buy') {
      reasoning.push(
        `${currency} shows favorable conditions for investment with ` +
        `${expectedChange > 0 ? 'upward' : 'downward'} momentum`
      );
    } else if (action === 'sell') {
      reasoning.push(
        `Market indicators suggest reducing ${currency} exposure due to ` +
        `${trend.direction} trend`
      );
    } else if (action === 'hold') {
      reasoning.push(
        `Current market conditions recommend maintaining ${currency} positions`
      );
    } else {
      reasoning.push(`Waiting for better entry point for ${currency} investment`);
    }

    // Trend information
    reasoning.push(
      `${trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} trend ` +
      `with ${trend.strength.toFixed(0)}% strength`
    );

    // Volatility consideration
    reasoning.push(`Market volatility is ${volatility.type}`);

    // Prediction insight
    reasoning.push(
      `Expected ${expectedChange > 0 ? 'appreciation' : 'depreciation'} of ` +
      `${Math.abs(expectedChange).toFixed(2)}% over ${prediction.timeHorizon}`
    );

    return reasoning;
  }

  private determineTimeframe(
    trend: TrendAnalysis,
    volatility: VolatilityPattern,
    expectedChange: number
  ): string {
    if (volatility.type === 'high') {
      return 'Monitor daily, act within 1-3 days';
    }

    if (Math.abs(expectedChange) > 3) {
      return 'Act within 24-48 hours';
    }

    if (trend.strength > 70) {
      return '3-7 days optimal window';
    }

    return '1-2 weeks recommended timeframe';
  }

  private assessRiskLevel(
    volatility: VolatilityPattern,
    trend: TrendAnalysis,
    expectedChange: number
  ): 'low' | 'medium' | 'high' {
    if (volatility.type === 'high' || Math.abs(expectedChange) > 5) {
      return 'high';
    }

    if (volatility.type === 'medium' || trend.confidence < 0.5) {
      return 'medium';
    }

    return 'low';
  }

  private generateExchangeRecommendation(
    currency: string,
    action: CurrencyExchangeWindow['action'],
    urgency: CurrencyExchangeWindow['urgency'],
    expectedChange: number,
    currentRate: number,
    targetRate?: number,
    amount?: number
  ): string {
    const amountStr = amount ? ` ${amount.toLocaleString('cs-CZ')} CZK` : '';

    if (action === 'exchange_now') {
      const savingsStr = amount
        ? ` (potential savings: ${(amount * Math.abs(expectedChange) / 100).toFixed(0)} CZK)`
        : '';

      return urgency === 'high'
        ? `Strongly recommend exchanging${amountStr} to ${currency} immediately at ` +
          `${currentRate.toFixed(4)}. Rate expected to worsen by ` +
          `${Math.abs(expectedChange).toFixed(2)}%${savingsStr}.`
        : `Consider exchanging${amountStr} to ${currency} soon at current rate ` +
          `${currentRate.toFixed(4)} before expected decline.`;
    }

    if (action === 'wait') {
      const targetStr = targetRate ? ` targeting ${targetRate.toFixed(4)}` : '';
      const savingsStr = amount && targetRate
        ? ` (potential savings: ${(amount * Math.abs(expectedChange) / 100).toFixed(0)} CZK)`
        : '';

      return `Hold off on exchanging${amountStr} to ${currency}. Rate expected to improve by ` +
             `${Math.abs(expectedChange).toFixed(2)}%${targetStr}${savingsStr}.`;
    }

    return `You can exchange${amountStr} to ${currency} at your convenience. ` +
           `Current rate is ${currentRate.toFixed(4)} with minimal expected movement.`;
  }

  private analyzeOverallSentiment(): 'bullish' | 'bearish' | 'neutral' {
    const trends = Array.from(this.context.marketData.trends.values());

    if (trends.length === 0) return 'neutral';

    const bullishCount = trends.filter(t => t.direction === 'bullish').length;
    const bearishCount = trends.filter(t => t.direction === 'bearish').length;

    if (bullishCount > bearishCount * 1.5) return 'bullish';
    if (bearishCount > bullishCount * 1.5) return 'bearish';
    return 'neutral';
  }

  private generateKeyInsights(): string[] {
    const insights: string[] = [];

    // Analyze strongest trends
    const trends = Array.from(this.context.marketData.trends.entries())
      .sort((a, b) => b[1].strength - a[1].strength);

    if (trends.length > 0) {
      const [currency, trend] = trends[0];
      insights.push(
        `${currency} showing ${trend.direction} trend with ${trend.strength.toFixed(0)}% strength`
      );
    }

    // Analyze volatility
    const volatilities = Array.from(this.context.marketData.volatilityPatterns.entries());
    const highVolatility = volatilities.filter(([_, v]) => v.type === 'high');

    if (highVolatility.length > 0) {
      insights.push(
        `High volatility detected in ${highVolatility.length} ` +
        `${highVolatility.length === 1 ? 'currency' : 'currencies'}`
      );
    }

    // Analyze predictions
    const predictions = Array.from(this.context.marketData.predictions.values());
    const significantChanges = predictions.filter(p => {
      const change = Math.abs((p.predictedRate - p.currentRate) / p.currentRate * 100);
      return change > 1.5 && p.confidence > this.CONFIDENCE_THRESHOLD;
    });

    if (significantChanges.length > 0) {
      insights.push(
        `${significantChanges.length} ${significantChanges.length === 1 ? 'currency' : 'currencies'} ` +
        `expected to move significantly in coming days`
      );
    }

    return insights;
  }

  private createNarrativeSummary(sentiment: string, insights: string[]): string {
    const sentimentText = {
      bullish: 'The Czech koruna is showing strength across major currency pairs',
      bearish: 'The Czech koruna is experiencing weakness against major currencies',
      neutral: 'Czech currency markets are trading in a balanced range'
    };

    let narrative = sentimentText[sentiment as keyof typeof sentimentText] + '. ';

    if (insights.length > 0) {
      narrative += insights[0] + '. ';
    }

    narrative += 'Market participants should monitor developments closely.';

    return narrative;
  }

  private identifyTopOpportunities(): MarketSummary['topOpportunities'] {
    const opportunities: MarketSummary['topOpportunities'] = [];

    // Check exchange opportunities
    const predictions = Array.from(this.context.marketData.predictions.entries());

    for (const [currency, prediction] of predictions) {
      const expectedChange = (prediction.predictedRate - prediction.currentRate) / prediction.currentRate * 100;

      if (expectedChange < -1.5 && prediction.confidence > this.CONFIDENCE_THRESHOLD) {
        opportunities.push({
          currency,
          type: 'exchange',
          description: `Exchange CZK to ${currency} before expected ${Math.abs(expectedChange).toFixed(1)}% decline`,
          priority: Math.abs(expectedChange) * prediction.confidence
        });
      }

      if (expectedChange > 2 && prediction.confidence > this.CONFIDENCE_THRESHOLD) {
        opportunities.push({
          currency,
          type: 'investment',
          description: `Consider ${currency} investment for ${expectedChange.toFixed(1)}% potential upside`,
          priority: expectedChange * prediction.confidence
        });
      }
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  private assessMarketRisks(): MarketSummary['risks'] {
    const risks: MarketSummary['risks'] = [];

    // Check volatility risks
    const volatilities = Array.from(this.context.marketData.volatilityPatterns.entries());

    for (const [currency, pattern] of volatilities) {
      if (pattern.type === 'high') {
        risks.push({
          type: 'volatility',
          description: `${currency} experiencing high volatility (σ=${pattern.stdDeviation.toFixed(4)})`,
          severity: 'high'
        });
      }
    }

    // Check trend reversal risks
    const trends = Array.from(this.context.marketData.trends.entries());

    for (const [currency, trend] of trends) {
      if (trend.strength > 60 && trend.confidence < 0.6) {
        risks.push({
          type: 'trend_reversal',
          description: `${currency} strong trend but low confidence - reversal risk`,
          severity: 'medium'
        });
      }
    }

    return risks.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private generateClosingAdvice(summary: MarketSummary): string {
    const riskTolerance = this.context.userProfile?.riskTolerance || 'moderate';

    if (summary.risks.some(r => r.severity === 'high')) {
      if (riskTolerance === 'conservative') {
        return 'Given current market volatility, conservative investors should exercise caution and consider delaying major currency transactions.';
      }
      return 'Monitor market conditions closely and be prepared to act quickly if opportunities arise.';
    }

    if (summary.topOpportunities.length > 0) {
      return `There are ${summary.topOpportunities.length} opportunities worth considering - review them carefully and act according to your investment strategy.`;
    }

    return 'Market conditions are stable. Continue with your regular currency exchange and investment plans.';
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Creates a market advisor with sample data for demonstration
 */
export function createSampleAdvisor(): CzechMarketAdvisor {
  const now = new Date();

  // Sample exchange rates
  const eurRates: ExchangeRate[] = [];
  const usdRates: ExchangeRate[] = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    eurRates.push({
      currency: 'EUR',
      rate: 25.0 + Math.sin(i / 5) * 0.3 + (Math.random() - 0.5) * 0.1,
      timestamp: date
    });

    usdRates.push({
      currency: 'USD',
      rate: 23.0 + Math.cos(i / 4) * 0.4 + (Math.random() - 0.5) * 0.15,
      timestamp: date
    });
  }

  const context: AdvisorContext = {
    userProfile: {
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCurrencies: ['EUR', 'USD']
    },
    marketData: {
      exchangeRates: new Map([
        ['EUR', eurRates],
        ['USD', usdRates]
      ]),
      trends: new Map([
        ['EUR', {
          direction: 'bullish',
          strength: 65,
          confidence: 0.75,
          timeframe: '30d',
          indicators: { movingAverage: 25.1, volatility: 0.15, momentum: 0.2 }
        }],
        ['USD', {
          direction: 'neutral',
          strength: 35,
          confidence: 0.6,
          timeframe: '30d',
          indicators: { movingAverage: 23.15, volatility: 0.22, momentum: 0.05 }
        }]
      ]),
      predictions: new Map([
        ['EUR', {
          currency: 'EUR',
          currentRate: eurRates[eurRates.length - 1].rate,
          predictedRate: eurRates[eurRates.length - 1].rate * 1.012,
          timeHorizon: '7d',
          confidence: 0.78,
          factors: ['Bullish trend', 'Low volatility', 'Positive momentum']
        }],
        ['USD', {
          currency: 'USD',
          currentRate: usdRates[usdRates.length - 1].rate,
          predictedRate: usdRates[usdRates.length - 1].rate * 0.995,
          timeHorizon: '7d',
          confidence: 0.65,
          factors: ['Neutral trend', 'Medium volatility', 'Weak momentum']
        }]
      ]),
      volatilityPatterns: new Map([
        ['EUR', {
          type: 'low',
          stdDeviation: 0.15,
          range: { min: 24.7, max: 25.4 },
          avgChange: 0.08,
          detectedAt: now
        }],
        ['USD', {
          type: 'medium',
          stdDeviation: 0.22,
          range: { min: 22.6, max: 23.6 },
          avgChange: 0.12,
          detectedAt: now
        }]
      ])
    }
  };

  return new CzechMarketAdvisor(context);
}
