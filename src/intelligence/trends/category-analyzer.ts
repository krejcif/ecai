/**
 * CategoryAnalyzer - Analyzes category performance, growth rates, and market opportunities
 */

import { TrendDocument, ProductDocument } from '../../database/collections';

export interface CategoryMetrics {
  category: string;
  totalVolume: number;
  growthRate: number; // Percentage growth
  marketShare: number; // 0-1
  velocity: number; // Rate of change
  volatility: number; // Price/demand stability
  competitionLevel: number; // 0-1
}

export interface CategoryHealth {
  category: string;
  healthScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  opportunities: string[];
}

export interface OpportunityScore {
  category: string;
  score: number; // 0-100
  ranking: number;
  factors: {
    growthPotential: number;
    marketSize: number;
    competitionLevel: number;
    profitability: number;
    accessibility: number;
  };
  recommendation: 'high-priority' | 'consider' | 'monitor' | 'avoid';
  estimatedROI: number;
}

export interface MarketShareAnalysis {
  category: string;
  totalMarketSize: number;
  topPlayers: Array<{
    name: string;
    share: number;
    trend: 'growing' | 'stable' | 'declining';
  }>;
  concentration: number; // HHI (Herfindahl-Hirschman Index)
  competitionIntensity: 'monopoly' | 'oligopoly' | 'competitive' | 'fragmented';
}

export interface GrowthAnalysis {
  category: string;
  currentGrowthRate: number;
  historicalGrowthRates: number[];
  projectedGrowthRate: number;
  growthStage: 'emerging' | 'growth' | 'mature' | 'declining';
  timeToMaturity?: number; // Estimated years
}

export class CategoryAnalyzer {
  private readonly minDataPoints: number = 7;
  private readonly growthStageThresholds = {
    emerging: 0.25, // 25%+ growth
    growth: 0.10, // 10%+ growth
    mature: -0.05, // -5% to 10% growth
    // declining: < -5%
  };

  /**
   * Calculate comprehensive metrics for a category
   */
  async analyzeCategoryMetrics(
    category: string,
    trendData: TrendDocument[],
    allTrendData: TrendDocument[],
    productData?: ProductDocument[]
  ): Promise<CategoryMetrics> {
    // Filter data for this category
    const categoryData = trendData.filter((d) => d.category === category);

    if (categoryData.length < this.minDataPoints) {
      throw new Error(
        `Insufficient data for category ${category}. Need at least ${this.minDataPoints} points.`
      );
    }

    // Sort by timestamp
    const sorted = categoryData.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate total volume
    const totalVolume = sorted.reduce((sum, d) => sum + d.volume, 0);

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(sorted);

    // Calculate market share
    const marketShare = this.calculateMarketShare(category, allTrendData);

    // Calculate velocity (rate of change)
    const velocity = this.calculateVelocity(sorted);

    // Calculate volatility
    const volatility = this.calculateVolatility(sorted);

    // Calculate competition level
    const competitionLevel = productData
      ? this.calculateCompetitionLevel(category, productData)
      : 0.5; // Default moderate competition

    return {
      category,
      totalVolume,
      growthRate,
      marketShare,
      velocity,
      volatility,
      competitionLevel,
    };
  }

  /**
   * Analyze category health
   */
  async analyzeCategoryHealth(
    category: string,
    metrics: CategoryMetrics,
    trendData: TrendDocument[]
  ): Promise<CategoryHealth> {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];

    // Analyze growth
    if (metrics.growthRate > 0.15) {
      strengths.push(`Strong growth rate of ${(metrics.growthRate * 100).toFixed(1)}%`);
      opportunities.push('Capitalize on rapid market expansion');
    } else if (metrics.growthRate < -0.05) {
      weaknesses.push(`Declining growth rate of ${(metrics.growthRate * 100).toFixed(1)}%`);
      risks.push('Market contraction may continue');
    }

    // Analyze market share
    if (metrics.marketShare > 0.2) {
      strengths.push(`Significant market share of ${(metrics.marketShare * 100).toFixed(1)}%`);
    } else if (metrics.marketShare < 0.05) {
      weaknesses.push(`Low market share of ${(metrics.marketShare * 100).toFixed(1)}%`);
      opportunities.push('Potential for market share growth');
    }

    // Analyze volatility
    if (metrics.volatility < 0.2) {
      strengths.push('Stable and predictable demand');
    } else if (metrics.volatility > 0.5) {
      weaknesses.push('High volatility in demand');
      risks.push('Unpredictable market conditions');
    }

    // Analyze competition
    if (metrics.competitionLevel < 0.3) {
      opportunities.push('Low competition - market entry opportunity');
    } else if (metrics.competitionLevel > 0.7) {
      weaknesses.push('Highly competitive market');
      risks.push('Price pressure from competitors');
    }

    // Analyze velocity
    if (metrics.velocity > 0.1) {
      strengths.push('Positive momentum in the market');
    } else if (metrics.velocity < -0.1) {
      weaknesses.push('Negative momentum');
      risks.push('Accelerating decline');
    }

    // Calculate health score
    const healthScore = this.calculateHealthScore(metrics, strengths, weaknesses, risks);

    // Determine status
    let status: CategoryHealth['status'];
    if (healthScore >= 80) status = 'excellent';
    else if (healthScore >= 60) status = 'good';
    else if (healthScore >= 40) status = 'fair';
    else if (healthScore >= 20) status = 'poor';
    else status = 'critical';

    return {
      category,
      healthScore,
      status,
      strengths,
      weaknesses,
      risks,
      opportunities,
    };
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(
    metrics: CategoryMetrics,
    strengths: string[],
    weaknesses: string[],
    risks: string[]
  ): number {
    let score = 50; // Base score

    // Growth contribution (±30 points)
    score += Math.min(30, metrics.growthRate * 100);

    // Market share contribution (±20 points)
    score += metrics.marketShare * 20;

    // Volatility penalty (0 to -20 points)
    score -= metrics.volatility * 20;

    // Competition penalty (0 to -15 points)
    score -= metrics.competitionLevel * 15;

    // Velocity contribution (±15 points)
    score += metrics.velocity * 15;

    // Qualitative adjustments
    score += strengths.length * 2;
    score -= weaknesses.length * 2;
    score -= risks.length * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score categories by opportunity
   */
  async scoreOpportunities(
    categoriesMetrics: Map<string, CategoryMetrics>,
    productData?: Map<string, ProductDocument[]>
  ): Promise<OpportunityScore[]> {
    const scores: OpportunityScore[] = [];

    for (const [category, metrics] of categoriesMetrics.entries()) {
      // Calculate opportunity factors
      const growthPotential = this.scoreGrowthPotential(metrics);
      const marketSize = this.scoreMarketSize(metrics);
      const competitionLevel = 1 - metrics.competitionLevel; // Inverse - low competition is good
      const profitability = this.scoreProfitability(category, productData);
      const accessibility = this.scoreAccessibility(metrics);

      // Weighted score
      const score =
        growthPotential * 0.3 +
        marketSize * 0.25 +
        competitionLevel * 0.2 +
        profitability * 0.15 +
        accessibility * 0.1;

      // Normalize to 0-100
      const normalizedScore = score * 100;

      // Determine recommendation
      let recommendation: OpportunityScore['recommendation'];
      if (normalizedScore >= 75) recommendation = 'high-priority';
      else if (normalizedScore >= 55) recommendation = 'consider';
      else if (normalizedScore >= 35) recommendation = 'monitor';
      else recommendation = 'avoid';

      // Estimate ROI (simplified)
      const estimatedROI = this.estimateROI(metrics, growthPotential, competitionLevel);

      scores.push({
        category,
        score: normalizedScore,
        ranking: 0, // Will be set after sorting
        factors: {
          growthPotential,
          marketSize,
          competitionLevel,
          profitability,
          accessibility,
        },
        recommendation,
        estimatedROI,
      });
    }

    // Sort by score and assign rankings
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((score, index) => {
      score.ranking = index + 1;
    });

    return scores;
  }

  /**
   * Score growth potential (0-1)
   */
  private scoreGrowthPotential(metrics: CategoryMetrics): number {
    // Consider both current growth and momentum
    const growthScore = Math.min(metrics.growthRate * 2, 1.0); // Cap at 50% growth
    const momentumScore = Math.min(Math.abs(metrics.velocity), 1.0);

    return Math.max(0, growthScore * 0.7 + momentumScore * 0.3);
  }

  /**
   * Score market size (0-1)
   */
  private scoreMarketSize(metrics: CategoryMetrics): number {
    // Normalize volume (assuming 100k is a large market)
    const volumeScore = Math.min(metrics.totalVolume / 100000, 1.0);

    // Market share also indicates market size
    const shareScore = Math.min(metrics.marketShare * 2, 1.0);

    return volumeScore * 0.6 + shareScore * 0.4;
  }

  /**
   * Score profitability (0-1)
   */
  private scoreProfitability(
    category: string,
    productData?: Map<string, ProductDocument[]>
  ): number {
    if (!productData) return 0.5; // Default moderate profitability

    const products = productData.get(category);
    if (!products || products.length === 0) return 0.5;

    // Calculate average price as proxy for profitability
    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;

    // Normalize (assuming $100 is high price)
    return Math.min(avgPrice / 100, 1.0);
  }

  /**
   * Score accessibility (0-1)
   */
  private scoreAccessibility(metrics: CategoryMetrics): number {
    // Lower volatility = more accessible/stable
    const stabilityScore = Math.max(0, 1 - metrics.volatility);

    // Moderate competition is ideal (too low or too high is bad)
    const competitionScore = 1 - Math.abs(metrics.competitionLevel - 0.5) * 2;

    return stabilityScore * 0.6 + competitionScore * 0.4;
  }

  /**
   * Estimate ROI
   */
  private estimateROI(
    metrics: CategoryMetrics,
    growthPotential: number,
    competitionScore: number
  ): number {
    // ROI = (Growth Potential × Market Share Gain) / Competition
    const baseROI = (growthPotential * 100 * (1 - metrics.marketShare)) /
                    Math.max(0.1, 1 - competitionScore);

    return Math.max(0, Math.min(500, baseROI)); // Cap at 500% ROI
  }

  /**
   * Analyze market share distribution
   */
  async analyzeMarketShare(
    category: string,
    trendData: TrendDocument[],
    productData?: ProductDocument[]
  ): Promise<MarketShareAnalysis> {
    const categoryData = trendData.filter((d) => d.category === category);
    const totalMarketSize = categoryData.reduce((sum, d) => sum + d.volume, 0);

    // Group by keyword to identify top players
    const keywordVolumes = new Map<string, number>();
    categoryData.forEach((doc) => {
      const keyword = doc.keyword || 'unknown';
      keywordVolumes.set(keyword, (keywordVolumes.get(keyword) || 0) + doc.volume);
    });

    // Calculate shares
    const topPlayers = Array.from(keywordVolumes.entries())
      .map(([name, volume]) => {
        const share = totalMarketSize > 0 ? volume / totalMarketSize : 0;

        // Determine trend (simplified - would need historical data)
        const trend: 'growing' | 'stable' | 'declining' = 'stable';

        return { name, share, trend };
      })
      .sort((a, b) => b.share - a.share)
      .slice(0, 10); // Top 10

    // Calculate HHI (Herfindahl-Hirschman Index)
    const concentration = topPlayers.reduce(
      (sum, player) => sum + Math.pow(player.share * 100, 2),
      0
    );

    // Determine competition intensity
    let competitionIntensity: MarketShareAnalysis['competitionIntensity'];
    if (concentration > 2500) competitionIntensity = 'monopoly';
    else if (concentration > 1500) competitionIntensity = 'oligopoly';
    else if (concentration > 1000) competitionIntensity = 'competitive';
    else competitionIntensity = 'fragmented';

    return {
      category,
      totalMarketSize,
      topPlayers,
      concentration,
      competitionIntensity,
    };
  }

  /**
   * Analyze growth trajectory
   */
  async analyzeGrowth(
    category: string,
    trendData: TrendDocument[]
  ): Promise<GrowthAnalysis> {
    const categoryData = trendData
      .filter((d) => d.category === category)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate current growth rate
    const currentGrowthRate = this.calculateGrowthRate(categoryData);

    // Calculate historical growth rates (by period)
    const historicalGrowthRates = this.calculateHistoricalGrowthRates(categoryData);

    // Project future growth (simple linear projection)
    const projectedGrowthRate = this.projectGrowthRate(historicalGrowthRates);

    // Determine growth stage
    const growthStage = this.determineGrowthStage(currentGrowthRate, historicalGrowthRates);

    // Estimate time to maturity (if in growth stage)
    let timeToMaturity: number | undefined;
    if (growthStage === 'emerging' || growthStage === 'growth') {
      timeToMaturity = this.estimateTimeToMaturity(historicalGrowthRates);
    }

    return {
      category,
      currentGrowthRate,
      historicalGrowthRates,
      projectedGrowthRate,
      growthStage,
      timeToMaturity,
    };
  }

  /**
   * Calculate growth rate from time series
   */
  private calculateGrowthRate(data: TrendDocument[]): number {
    if (data.length < 2) return 0;

    // Compare first and last period
    const periods = 4; // Use quarters
    const periodSize = Math.floor(data.length / periods);

    if (periodSize < 1) {
      // Not enough data for period analysis
      const first = data[0].volume;
      const last = data[data.length - 1].volume;
      return first > 0 ? (last - first) / first : 0;
    }

    const firstPeriod = data.slice(0, periodSize);
    const lastPeriod = data.slice(-periodSize);

    const firstAvg = firstPeriod.reduce((sum, d) => sum + d.volume, 0) / firstPeriod.length;
    const lastAvg = lastPeriod.reduce((sum, d) => sum + d.volume, 0) / lastPeriod.length;

    return firstAvg > 0 ? (lastAvg - firstAvg) / firstAvg : 0;
  }

  /**
   * Calculate historical growth rates by period
   */
  private calculateHistoricalGrowthRates(data: TrendDocument[]): number[] {
    const rates: number[] = [];
    const periodSize = Math.max(7, Math.floor(data.length / 8)); // Weekly or 1/8 of data

    for (let i = periodSize; i < data.length; i += periodSize) {
      const prevPeriod = data.slice(i - periodSize, i);
      const currPeriod = data.slice(i, Math.min(i + periodSize, data.length));

      if (currPeriod.length === 0) break;

      const prevAvg = prevPeriod.reduce((sum, d) => sum + d.volume, 0) / prevPeriod.length;
      const currAvg = currPeriod.reduce((sum, d) => sum + d.volume, 0) / currPeriod.length;

      const rate = prevAvg > 0 ? (currAvg - prevAvg) / prevAvg : 0;
      rates.push(rate);
    }

    return rates;
  }

  /**
   * Project future growth rate
   */
  private projectGrowthRate(historicalRates: number[]): number {
    if (historicalRates.length === 0) return 0;

    // Simple weighted average (recent rates weighted more)
    let weightedSum = 0;
    let weightSum = 0;

    historicalRates.forEach((rate, index) => {
      const weight = index + 1; // More recent = higher weight
      weightedSum += rate * weight;
      weightSum += weight;
    });

    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  /**
   * Determine growth stage
   */
  private determineGrowthStage(
    currentRate: number,
    historicalRates: number[]
  ): GrowthAnalysis['growthStage'] {
    if (currentRate >= this.growthStageThresholds.emerging) {
      return 'emerging';
    } else if (currentRate >= this.growthStageThresholds.growth) {
      return 'growth';
    } else if (currentRate >= this.growthStageThresholds.mature) {
      return 'mature';
    } else {
      return 'declining';
    }
  }

  /**
   * Estimate time to maturity (years)
   */
  private estimateTimeToMaturity(historicalRates: number[]): number {
    if (historicalRates.length < 2) return 5; // Default estimate

    // Calculate rate of decline in growth rate
    const rateDecline =
      (historicalRates[0] - historicalRates[historicalRates.length - 1]) /
      historicalRates.length;

    if (rateDecline <= 0) return 10; // Growth rate increasing - far from maturity

    const currentRate = historicalRates[historicalRates.length - 1];
    const periodsToMaturity = Math.max(
      0,
      (currentRate - this.growthStageThresholds.mature) / rateDecline
    );

    // Convert periods to years (assuming quarterly periods)
    return Math.min(periodsToMaturity / 4, 10); // Cap at 10 years
  }

  /**
   * Calculate market share for a category
   */
  private calculateMarketShare(category: string, allData: TrendDocument[]): number {
    const categoryVolume = allData
      .filter((d) => d.category === category)
      .reduce((sum, d) => sum + d.volume, 0);

    const totalVolume = allData.reduce((sum, d) => sum + d.volume, 0);

    return totalVolume > 0 ? categoryVolume / totalVolume : 0;
  }

  /**
   * Calculate velocity (rate of change)
   */
  private calculateVelocity(data: TrendDocument[]): number {
    if (data.length < 3) return 0;

    const values = data.map((d) => d.volume);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    // Linear regression
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    return avgY > 0 ? slope / avgY : 0;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(data: TrendDocument[]): number {
    const values = data.map((d) => d.volume);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Calculate competition level from product data
   */
  private calculateCompetitionLevel(
    category: string,
    productData: ProductDocument[]
  ): number {
    const categoryProducts = productData.filter((p) => p.category === category);

    if (categoryProducts.length === 0) return 0.5; // Default moderate

    // Competition based on number of products and price variance
    const numProducts = categoryProducts.length;
    const productScore = Math.min(numProducts / 100, 1.0); // Normalize to 100 products

    // Price variance indicates competition
    const prices = categoryProducts.map((p) => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceVariance =
      prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const priceCV = avgPrice > 0 ? Math.sqrt(priceVariance) / avgPrice : 0;
    const priceScore = Math.min(priceCV * 2, 1.0); // Normalize

    return productScore * 0.6 + priceScore * 0.4;
  }

  /**
   * Batch analyze multiple categories
   */
  async batchAnalyzeCategories(
    categories: string[],
    trendData: TrendDocument[],
    productData?: ProductDocument[]
  ): Promise<Map<string, CategoryMetrics>> {
    const results = new Map<string, CategoryMetrics>();

    for (const category of categories) {
      try {
        const metrics = await this.analyzeCategoryMetrics(
          category,
          trendData,
          trendData,
          productData
        );
        results.set(category, metrics);
      } catch (error) {
        console.error(`Failed to analyze category ${category}:`, error);
      }
    }

    return results;
  }
}
