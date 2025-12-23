/**
 * MarketSignalService - Aggregates and analyzes market signals from multiple sources
 * Provides actionable insights with trend scoring
 */

import { TrendDocument } from '../../database/collections';

export interface MarketSignal {
  source: SignalSource;
  category: string;
  keyword?: string;
  signalType: SignalType;
  strength: number; // 0-1
  reliability: number; // 0-1 based on source quality
  timestamp: string;
  metadata?: Record<string, any>;
}

export enum SignalSource {
  SEARCH_TRENDS = 'search_trends',
  SOCIAL_MEDIA = 'social_media',
  COMPETITOR_PRICING = 'competitor_pricing',
  INVENTORY_LEVELS = 'inventory_levels',
  CUSTOMER_REVIEWS = 'customer_reviews',
  SUPPLIER_SIGNALS = 'supplier_signals',
  ECONOMIC_DATA = 'economic_data',
  INDUSTRY_NEWS = 'industry_news',
}

export enum SignalType {
  DEMAND_INCREASE = 'demand_increase',
  DEMAND_DECREASE = 'demand_decrease',
  PRICE_SENSITIVITY = 'price_sensitivity',
  QUALITY_CONCERN = 'quality_concern',
  SUPPLY_CONSTRAINT = 'supply_constraint',
  MARKET_OPPORTUNITY = 'market_opportunity',
  COMPETITIVE_THREAT = 'competitive_threat',
  SEASONAL_SHIFT = 'seasonal_shift',
}

export interface SignalWeight {
  source: SignalSource;
  weight: number; // Reliability weight
  recency: number; // Decay factor for old signals
}

export interface AggregatedSignal {
  category: string;
  keyword?: string;
  signals: MarketSignal[];
  weightedScore: number;
  dominantSignalType: SignalType;
  confidence: number;
  trendScore: TrendScore;
}

export enum TrendScore {
  HOT = 'hot', // Strong positive signals
  WARM = 'warm', // Moderate positive signals
  NEUTRAL = 'neutral', // Mixed or weak signals
  COOL = 'cool', // Moderate negative signals
  COLD = 'cold', // Strong negative signals
}

export interface ActionableInsight {
  category: string;
  keyword?: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  supportingSignals: MarketSignal[];
  confidence: number;
  estimatedImpact: number; // 0-1
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
}

export class MarketSignalService {
  private signalWeights: Map<SignalSource, SignalWeight>;
  private readonly signalDecayDays: number = 7; // Signals decay over 7 days

  constructor() {
    this.signalWeights = this.initializeSignalWeights();
  }

  /**
   * Initialize default signal weights based on reliability
   */
  private initializeSignalWeights(): Map<SignalSource, SignalWeight> {
    const weights = new Map<SignalSource, SignalWeight>();

    weights.set(SignalSource.SEARCH_TRENDS, {
      source: SignalSource.SEARCH_TRENDS,
      weight: 0.9,
      recency: 0.15, // Decays quickly
    });

    weights.set(SignalSource.SOCIAL_MEDIA, {
      source: SignalSource.SOCIAL_MEDIA,
      weight: 0.7,
      recency: 0.2, // Decays very quickly
    });

    weights.set(SignalSource.COMPETITOR_PRICING, {
      source: SignalSource.COMPETITOR_PRICING,
      weight: 0.85,
      recency: 0.1,
    });

    weights.set(SignalSource.INVENTORY_LEVELS, {
      source: SignalSource.INVENTORY_LEVELS,
      weight: 0.95,
      recency: 0.05, // Very reliable, slow decay
    });

    weights.set(SignalSource.CUSTOMER_REVIEWS, {
      source: SignalSource.CUSTOMER_REVIEWS,
      weight: 0.8,
      recency: 0.08,
    });

    weights.set(SignalSource.SUPPLIER_SIGNALS, {
      source: SignalSource.SUPPLIER_SIGNALS,
      weight: 0.75,
      recency: 0.12,
    });

    weights.set(SignalSource.ECONOMIC_DATA, {
      source: SignalSource.ECONOMIC_DATA,
      weight: 0.7,
      recency: 0.03, // Economic data changes slowly
    });

    weights.set(SignalSource.INDUSTRY_NEWS, {
      source: SignalSource.INDUSTRY_NEWS,
      weight: 0.65,
      recency: 0.1,
    });

    return weights;
  }

  /**
   * Aggregate signals from multiple sources
   */
  async aggregateSignals(signals: MarketSignal[]): Promise<Map<string, AggregatedSignal>> {
    // Group signals by category
    const groupedByCategory = this.groupSignalsByCategory(signals);
    const aggregated = new Map<string, AggregatedSignal>();

    for (const [category, categorySignals] of groupedByCategory.entries()) {
      // Further group by keyword if available
      const byKeyword = this.groupSignalsByKeyword(categorySignals);

      if (byKeyword.size === 0) {
        // Aggregate at category level
        const agg = this.aggregateSignalGroup(category, undefined, categorySignals);
        aggregated.set(category, agg);
      } else {
        // Aggregate by keyword
        for (const [keyword, keywordSignals] of byKeyword.entries()) {
          const key = `${category}:${keyword}`;
          const agg = this.aggregateSignalGroup(category, keyword, keywordSignals);
          aggregated.set(key, agg);
        }
      }
    }

    return aggregated;
  }

  /**
   * Aggregate a group of signals
   */
  private aggregateSignalGroup(
    category: string,
    keyword: string | undefined,
    signals: MarketSignal[]
  ): AggregatedSignal {
    // Calculate weighted score
    const weightedScore = this.calculateWeightedScore(signals);

    // Find dominant signal type
    const dominantSignalType = this.findDominantSignalType(signals);

    // Calculate confidence
    const confidence = this.calculateSignalConfidence(signals);

    // Determine trend score
    const trendScore = this.calculateTrendScore(weightedScore, signals);

    return {
      category,
      keyword,
      signals,
      weightedScore,
      dominantSignalType,
      confidence,
      trendScore,
    };
  }

  /**
   * Calculate weighted score for signals
   */
  private calculateWeightedScore(signals: MarketSignal[]): number {
    if (signals.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;
    const now = new Date();

    for (const signal of signals) {
      const signalWeight = this.signalWeights.get(signal.source);
      if (!signalWeight) continue;

      // Calculate time-based decay
      const signalDate = new Date(signal.timestamp);
      const daysDiff = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-signalWeight.recency * daysDiff);

      // Combined weight
      const weight = signalWeight.weight * signal.reliability * decayFactor;

      // Signal value: positive for positive signals, negative for negative
      const signalValue = this.getSignalValue(signal.signalType) * signal.strength;

      weightedSum += signalValue * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get signal value (-1 to 1) based on signal type
   */
  private getSignalValue(signalType: SignalType): number {
    const values: Record<SignalType, number> = {
      [SignalType.DEMAND_INCREASE]: 1.0,
      [SignalType.MARKET_OPPORTUNITY]: 0.8,
      [SignalType.SEASONAL_SHIFT]: 0.5,
      [SignalType.PRICE_SENSITIVITY]: 0.0,
      [SignalType.QUALITY_CONCERN]: -0.3,
      [SignalType.SUPPLY_CONSTRAINT]: -0.5,
      [SignalType.COMPETITIVE_THREAT]: -0.7,
      [SignalType.DEMAND_DECREASE]: -1.0,
    };

    return values[signalType] || 0;
  }

  /**
   * Find dominant signal type
   */
  private findDominantSignalType(signals: MarketSignal[]): SignalType {
    const typeCounts = new Map<SignalType, number>();

    for (const signal of signals) {
      const weight = this.signalWeights.get(signal.source)?.weight || 0.5;
      const current = typeCounts.get(signal.signalType) || 0;
      typeCounts.set(signal.signalType, current + weight * signal.strength);
    }

    let maxCount = 0;
    let dominantType = SignalType.DEMAND_INCREASE;

    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return dominantType;
  }

  /**
   * Calculate confidence in aggregated signal
   */
  private calculateSignalConfidence(signals: MarketSignal[]): number {
    if (signals.length === 0) return 0;

    // Confidence increases with:
    // 1. Number of signals
    // 2. Diversity of sources
    // 3. Agreement between signals
    // 4. Reliability of sources

    // Source diversity
    const uniqueSources = new Set(signals.map((s) => s.source)).size;
    const diversityScore = Math.min(uniqueSources / 5, 1.0); // Max at 5 sources

    // Signal agreement (low variance in signal values)
    const signalValues = signals.map(
      (s) => this.getSignalValue(s.signalType) * s.strength
    );
    const mean = signalValues.reduce((a, b) => a + b, 0) / signalValues.length;
    const variance =
      signalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      signalValues.length;
    const agreementScore = Math.max(0, 1 - Math.sqrt(variance));

    // Average reliability
    const avgReliability =
      signals.reduce((sum, s) => sum + s.reliability, 0) / signals.length;

    // Quantity score
    const quantityScore = Math.min(signals.length / 10, 1.0); // Max at 10 signals

    // Combined confidence
    return (
      diversityScore * 0.3 +
      agreementScore * 0.3 +
      avgReliability * 0.25 +
      quantityScore * 0.15
    );
  }

  /**
   * Calculate trend score (hot/warm/neutral/cool/cold)
   */
  private calculateTrendScore(weightedScore: number, signals: MarketSignal[]): TrendScore {
    // Consider both weighted score and signal strength

    // Calculate average signal strength
    const avgStrength =
      signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;

    // Combined score
    const combinedScore = weightedScore * avgStrength;

    if (combinedScore > 0.6) return TrendScore.HOT;
    if (combinedScore > 0.3) return TrendScore.WARM;
    if (combinedScore > -0.3) return TrendScore.NEUTRAL;
    if (combinedScore > -0.6) return TrendScore.COOL;
    return TrendScore.COLD;
  }

  /**
   * Generate actionable insights from aggregated signals
   */
  async generateInsights(
    aggregatedSignals: Map<string, AggregatedSignal>,
    minConfidence: number = 0.5
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    for (const [key, signal] of aggregatedSignals.entries()) {
      if (signal.confidence < minConfidence) continue;

      const insight = this.createInsight(signal);
      if (insight) {
        insights.push(insight);
      }
    }

    // Sort by priority and confidence
    insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    return insights;
  }

  /**
   * Create insight from aggregated signal
   */
  private createInsight(signal: AggregatedSignal): ActionableInsight | null {
    let insight = '';
    let recommendation = '';
    let priority: ActionableInsight['priority'] = 'medium';
    let timeframe: ActionableInsight['timeframe'] = 'short-term';

    const categoryName = signal.keyword
      ? `${signal.keyword} in ${signal.category}`
      : signal.category;

    switch (signal.trendScore) {
      case TrendScore.HOT:
        insight = `Strong upward trend detected for ${categoryName}`;
        recommendation = `Increase inventory and marketing budget. Consider price optimization to capture demand surge.`;
        priority = 'high';
        timeframe = 'immediate';
        break;

      case TrendScore.WARM:
        insight = `Moderate positive momentum for ${categoryName}`;
        recommendation = `Monitor closely and prepare for potential demand increase. Consider promotional campaigns.`;
        priority = 'medium';
        timeframe = 'short-term';
        break;

      case TrendScore.COOL:
        insight = `Declining interest in ${categoryName}`;
        recommendation = `Review pricing strategy and product positioning. Consider clearance sales or product refresh.`;
        priority = 'medium';
        timeframe = 'short-term';
        break;

      case TrendScore.COLD:
        insight = `Significant downward trend for ${categoryName}`;
        recommendation = `Reduce inventory exposure. Implement aggressive clearance strategy or discontinue product line.`;
        priority = 'high';
        timeframe = 'immediate';
        break;

      default:
        insight = `Stable demand for ${categoryName}`;
        recommendation = `Maintain current strategy. Continue monitoring for changes.`;
        priority = 'low';
        timeframe = 'medium-term';
    }

    // Adjust based on dominant signal type
    if (signal.dominantSignalType === SignalType.SUPPLY_CONSTRAINT) {
      recommendation += ` Note: Supply constraints detected - secure alternative suppliers.`;
      priority = 'high';
    } else if (signal.dominantSignalType === SignalType.COMPETITIVE_THREAT) {
      recommendation += ` Note: Competitive pressure identified - review competitive positioning.`;
      priority = priority === 'low' ? 'medium' : priority;
    } else if (signal.dominantSignalType === SignalType.QUALITY_CONCERN) {
      recommendation += ` Note: Quality concerns raised - investigate and address immediately.`;
      priority = 'high';
      timeframe = 'immediate';
    }

    // Calculate estimated impact
    const estimatedImpact = Math.abs(signal.weightedScore) * signal.confidence;

    return {
      category: signal.category,
      keyword: signal.keyword,
      insight,
      priority,
      recommendation,
      supportingSignals: signal.signals,
      confidence: signal.confidence,
      estimatedImpact,
      timeframe,
    };
  }

  /**
   * Create market signal from trend document
   */
  createSignalFromTrend(
    trendDoc: TrendDocument,
    source: SignalSource = SignalSource.SEARCH_TRENDS
  ): MarketSignal {
    // Determine signal type based on growth
    let signalType: SignalType;
    if (trendDoc.growth > 0.2) {
      signalType = SignalType.DEMAND_INCREASE;
    } else if (trendDoc.growth < -0.2) {
      signalType = SignalType.DEMAND_DECREASE;
    } else {
      signalType = SignalType.MARKET_OPPORTUNITY;
    }

    // Calculate strength based on volume and growth
    const normalizedVolume = Math.min(trendDoc.volume / 10000, 1.0);
    const normalizedGrowth = Math.min(Math.abs(trendDoc.growth), 1.0);
    const strength = (normalizedVolume * 0.5 + normalizedGrowth * 0.5);

    return {
      source,
      category: trendDoc.category || 'unknown',
      keyword: trendDoc.keyword,
      signalType,
      strength: Math.min(strength, 1.0),
      reliability: 0.8, // Default reliability
      timestamp: trendDoc.timestamp,
      metadata: trendDoc.metadata,
    };
  }

  /**
   * Update signal weights based on historical accuracy
   */
  updateSignalWeights(
    source: SignalSource,
    accuracyScore: number // 0-1
  ): void {
    const current = this.signalWeights.get(source);
    if (!current) return;

    // Adjust weight based on accuracy (moving average)
    const newWeight = current.weight * 0.8 + accuracyScore * 0.2;

    this.signalWeights.set(source, {
      ...current,
      weight: Math.max(0.1, Math.min(1.0, newWeight)),
    });
  }

  /**
   * Get current signal weights
   */
  getSignalWeights(): Map<SignalSource, SignalWeight> {
    return new Map(this.signalWeights);
  }

  /**
   * Group signals by category
   */
  private groupSignalsByCategory(
    signals: MarketSignal[]
  ): Map<string, MarketSignal[]> {
    const grouped = new Map<string, MarketSignal[]>();

    for (const signal of signals) {
      const existing = grouped.get(signal.category) || [];
      existing.push(signal);
      grouped.set(signal.category, existing);
    }

    return grouped;
  }

  /**
   * Group signals by keyword
   */
  private groupSignalsByKeyword(
    signals: MarketSignal[]
  ): Map<string, MarketSignal[]> {
    const grouped = new Map<string, MarketSignal[]>();

    for (const signal of signals) {
      if (!signal.keyword) continue;

      const existing = grouped.get(signal.keyword) || [];
      existing.push(signal);
      grouped.set(signal.keyword, existing);
    }

    return grouped;
  }

  /**
   * Filter signals by time window
   */
  filterSignalsByTimeWindow(
    signals: MarketSignal[],
    windowDays: number
  ): MarketSignal[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    return signals.filter((signal) => new Date(signal.timestamp) >= cutoff);
  }

  /**
   * Get signal summary statistics
   */
  getSignalStatistics(signals: MarketSignal[]): {
    totalSignals: number;
    bySource: Map<SignalSource, number>;
    byType: Map<SignalType, number>;
    avgStrength: number;
    avgReliability: number;
  } {
    const bySource = new Map<SignalSource, number>();
    const byType = new Map<SignalType, number>();

    let totalStrength = 0;
    let totalReliability = 0;

    for (const signal of signals) {
      bySource.set(signal.source, (bySource.get(signal.source) || 0) + 1);
      byType.set(signal.signalType, (byType.get(signal.signalType) || 0) + 1);
      totalStrength += signal.strength;
      totalReliability += signal.reliability;
    }

    return {
      totalSignals: signals.length,
      bySource,
      byType,
      avgStrength: signals.length > 0 ? totalStrength / signals.length : 0,
      avgReliability: signals.length > 0 ? totalReliability / signals.length : 0,
    };
  }
}
