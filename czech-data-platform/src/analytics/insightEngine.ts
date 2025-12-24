/**
 * Insight Engine - AI-powered analytics for Czech economic data
 * Analyzes exchange rates, currency volatility, and business intelligence
 */

// ===== TYPES & INTERFACES =====

export interface ExchangeRate {
  currency: string;
  rate: number;
  timestamp: Date;
  volume?: number;
}

export interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  confidence: number; // 0-1
  timeframe: string;
  indicators: {
    movingAverage?: number;
    volatility?: number;
    momentum?: number;
  };
}

export interface VolatilityPattern {
  type: 'high' | 'medium' | 'low';
  stdDeviation: number;
  range: { min: number; max: number };
  avgChange: number;
  detectedAt: Date;
}

export interface RatePrediction {
  currency: string;
  currentRate: number;
  predictedRate: number;
  timeHorizon: string; // e.g., "24h", "7d", "30d"
  confidence: number;
  factors: string[];
}

export interface CompanyData {
  ico: string; // Company registration number
  name: string;
  industry: string;
  region: string;
  employees?: number;
  revenue?: number;
  foundedYear?: number;
}

export interface IndustryTrend {
  industry: string;
  growthRate: number;
  companyCount: number;
  avgRevenue: number;
  topRegions: string[];
  sentiment: 'positive' | 'negative' | 'stable';
}

export interface RegionalDensity {
  region: string;
  companyCount: number;
  density: number; // companies per capita or per sq km
  dominantIndustries: string[];
  economicScore: number;
}

// ===== CZECH ECONOMY ANALYZER =====

export class CzechEconomyAnalyzer {
  private historicalRates: Map<string, ExchangeRate[]>;
  private readonly windowSize: number = 14; // days for moving average

  constructor() {
    this.historicalRates = new Map();
  }

  /**
   * Adds exchange rate data to the historical dataset
   */
  public addRateData(currency: string, rate: ExchangeRate): void {
    if (!this.historicalRates.has(currency)) {
      this.historicalRates.set(currency, []);
    }
    this.historicalRates.get(currency)!.push(rate);

    // Keep only last 365 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    this.historicalRates.set(
      currency,
      this.historicalRates.get(currency)!.filter(r => r.timestamp >= cutoffDate)
    );
  }

  /**
   * Analyzes exchange rate trends for CZK vs EUR, USD, or other currencies
   */
  public analyzeExchangeRateTrends(
    currency: 'EUR' | 'USD' | string,
    days: number = 30
  ): TrendAnalysis {
    const rates = this.getRatesForPeriod(currency, days);

    if (rates.length < 2) {
      return this.createNeutralTrend('Insufficient data');
    }

    const movingAvg = this.calculateMovingAverage(rates);
    const volatility = this.calculateVolatility(rates);
    const momentum = this.calculateMomentum(rates);

    // Determine trend direction
    const recentRate = rates[rates.length - 1].rate;
    const direction = this.determineTrendDirection(recentRate, movingAvg, momentum);

    // Calculate trend strength
    const strength = this.calculateTrendStrength(rates, volatility, momentum);

    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateConfidence(rates, volatility);

    return {
      direction,
      strength,
      confidence,
      timeframe: `${days}d`,
      indicators: {
        movingAverage: movingAvg,
        volatility,
        momentum
      }
    };
  }

  /**
   * Detects currency volatility patterns in recent data
   */
  public detectVolatilityPatterns(currency: string, days: number = 30): VolatilityPattern {
    const rates = this.getRatesForPeriod(currency, days);

    if (rates.length < 2) {
      throw new Error('Insufficient data for volatility analysis');
    }

    const values = rates.map(r => r.rate);
    const stdDev = this.calculateStandardDeviation(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate average daily change
    let totalChange = 0;
    for (let i = 1; i < values.length; i++) {
      totalChange += Math.abs(values[i] - values[i - 1]);
    }
    const avgChange = totalChange / (values.length - 1);

    // Classify volatility
    const coefficientOfVariation = (stdDev / mean) * 100;
    const type = coefficientOfVariation > 2 ? 'high' :
                 coefficientOfVariation > 0.5 ? 'medium' : 'low';

    return {
      type,
      stdDeviation: stdDev,
      range: { min, max },
      avgChange,
      detectedAt: new Date()
    };
  }

  /**
   * Predicts short-term exchange rate movements using trend analysis
   */
  public predictExchangeRate(
    currency: string,
    timeHorizon: '24h' | '7d' | '30d' = '24h'
  ): RatePrediction {
    const days = timeHorizon === '24h' ? 1 : timeHorizon === '7d' ? 7 : 30;
    const historicalDays = Math.max(days * 4, 30); // Use 4x data for prediction

    const rates = this.getRatesForPeriod(currency, historicalDays);

    if (rates.length < 7) {
      throw new Error('Insufficient historical data for prediction');
    }

    const currentRate = rates[rates.length - 1].rate;
    const trend = this.analyzeExchangeRateTrends(currency, historicalDays);
    const volatility = this.detectVolatilityPatterns(currency, historicalDays);

    // Simple prediction using trend momentum and moving average
    const momentum = trend.indicators.momentum || 0;
    const movingAvg = trend.indicators.movingAverage || currentRate;

    // Predict using weighted combination of trend and mean reversion
    const trendComponent = currentRate + (momentum * days * 0.1);
    const meanReversionComponent = movingAvg;
    const predictedRate = (trendComponent * 0.6) + (meanReversionComponent * 0.4);

    // Adjust confidence based on volatility
    let confidence = trend.confidence;
    if (volatility.type === 'high') {
      confidence *= 0.7;
    } else if (volatility.type === 'medium') {
      confidence *= 0.85;
    }

    const factors = [
      `${trend.direction} trend with ${trend.strength.toFixed(0)}% strength`,
      `${volatility.type} volatility (σ=${volatility.stdDeviation.toFixed(4)})`,
      `Momentum: ${momentum > 0 ? '+' : ''}${momentum.toFixed(4)}`
    ];

    return {
      currency,
      currentRate,
      predictedRate,
      timeHorizon,
      confidence,
      factors
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private getRatesForPeriod(currency: string, days: number): ExchangeRate[] {
    const rates = this.historicalRates.get(currency) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return rates.filter(r => r.timestamp >= cutoffDate);
  }

  private calculateMovingAverage(rates: ExchangeRate[]): number {
    const window = Math.min(this.windowSize, rates.length);
    const recentRates = rates.slice(-window);
    return recentRates.reduce((sum, r) => sum + r.rate, 0) / recentRates.length;
  }

  private calculateVolatility(rates: ExchangeRate[]): number {
    const values = rates.map(r => r.rate);
    return this.calculateStandardDeviation(values);
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateMomentum(rates: ExchangeRate[]): number {
    if (rates.length < 2) return 0;

    const recent = rates.slice(-7); // Last 7 data points
    if (recent.length < 2) return 0;

    const firstRate = recent[0].rate;
    const lastRate = recent[recent.length - 1].rate;
    return lastRate - firstRate;
  }

  private determineTrendDirection(
    currentRate: number,
    movingAvg: number,
    momentum: number
  ): 'bullish' | 'bearish' | 'neutral' {
    if (currentRate > movingAvg && momentum > 0) return 'bullish';
    if (currentRate < movingAvg && momentum < 0) return 'bearish';
    return 'neutral';
  }

  private calculateTrendStrength(
    rates: ExchangeRate[],
    volatility: number,
    momentum: number
  ): number {
    const values = rates.map(r => r.rate);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Normalize momentum by mean to get percentage
    const momentumPercent = Math.abs((momentum / mean) * 100);

    // Higher momentum and lower volatility = stronger trend
    const volatilityFactor = volatility === 0 ? 1 : 1 / (1 + volatility);
    const strength = Math.min(100, momentumPercent * 20 * volatilityFactor);

    return strength;
  }

  private calculateConfidence(rates: ExchangeRate[], volatility: number): number {
    const dataQuality = Math.min(1, rates.length / 30); // More data = higher confidence
    const stabilityFactor = 1 / (1 + volatility * 10); // Lower volatility = higher confidence
    return dataQuality * stabilityFactor;
  }

  private createNeutralTrend(reason: string): TrendAnalysis {
    return {
      direction: 'neutral',
      strength: 0,
      confidence: 0,
      timeframe: 'N/A',
      indicators: {}
    };
  }
}

// ===== BUSINESS INTELLIGENCE =====

export class BusinessIntelligence {
  private companies: CompanyData[];
  private industryCache: Map<string, IndustryTrend>;
  private regionalCache: Map<string, RegionalDensity>;

  constructor(companies: CompanyData[] = []) {
    this.companies = companies;
    this.industryCache = new Map();
    this.regionalCache = new Map();
  }

  /**
   * Adds company data to the intelligence system
   */
  public addCompanyData(company: CompanyData): void {
    this.companies.push(company);
    this.invalidateCaches();
  }

  /**
   * Adds multiple companies at once
   */
  public bulkAddCompanies(companies: CompanyData[]): void {
    this.companies.push(...companies);
    this.invalidateCaches();
  }

  /**
   * Analyzes Czech company data and returns insights
   */
  public analyzeCompanyData(): {
    totalCompanies: number;
    byIndustry: Record<string, number>;
    byRegion: Record<string, number>;
    avgEmployees: number;
    avgRevenue: number;
  } {
    const byIndustry: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    let totalEmployees = 0;
    let totalRevenue = 0;
    let employeeCount = 0;
    let revenueCount = 0;

    for (const company of this.companies) {
      byIndustry[company.industry] = (byIndustry[company.industry] || 0) + 1;
      byRegion[company.region] = (byRegion[company.region] || 0) + 1;

      if (company.employees !== undefined) {
        totalEmployees += company.employees;
        employeeCount++;
      }

      if (company.revenue !== undefined) {
        totalRevenue += company.revenue;
        revenueCount++;
      }
    }

    return {
      totalCompanies: this.companies.length,
      byIndustry,
      byRegion,
      avgEmployees: employeeCount > 0 ? totalEmployees / employeeCount : 0,
      avgRevenue: revenueCount > 0 ? totalRevenue / revenueCount : 0
    };
  }

  /**
   * Identifies industry trends in Czech market
   */
  public identifyIndustryTrends(industry: string): IndustryTrend {
    // Check cache
    if (this.industryCache.has(industry)) {
      return this.industryCache.get(industry)!;
    }

    const industryCompanies = this.companies.filter(c => c.industry === industry);

    if (industryCompanies.length === 0) {
      throw new Error(`No data available for industry: ${industry}`);
    }

    // Calculate growth rate based on recent company formations
    const currentYear = new Date().getFullYear();
    const recentCompanies = industryCompanies.filter(c =>
      c.foundedYear && c.foundedYear >= currentYear - 3
    );
    const olderCompanies = industryCompanies.filter(c =>
      c.foundedYear && c.foundedYear < currentYear - 3 && c.foundedYear >= currentYear - 6
    );

    const growthRate = olderCompanies.length > 0
      ? ((recentCompanies.length - olderCompanies.length) / olderCompanies.length) * 100
      : 0;

    // Calculate average revenue
    const companiesWithRevenue = industryCompanies.filter(c => c.revenue !== undefined);
    const avgRevenue = companiesWithRevenue.length > 0
      ? companiesWithRevenue.reduce((sum, c) => sum + c.revenue!, 0) / companiesWithRevenue.length
      : 0;

    // Find top regions
    const regionCounts: Record<string, number> = {};
    industryCompanies.forEach(c => {
      regionCounts[c.region] = (regionCounts[c.region] || 0) + 1;
    });

    const topRegions = Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region]) => region);

    // Determine sentiment
    const sentiment = growthRate > 5 ? 'positive' : growthRate < -5 ? 'negative' : 'stable';

    const trend: IndustryTrend = {
      industry,
      growthRate,
      companyCount: industryCompanies.length,
      avgRevenue,
      topRegions,
      sentiment
    };

    this.industryCache.set(industry, trend);
    return trend;
  }

  /**
   * Computes regional business density and economic indicators
   */
  public computeRegionalDensity(region: string, population?: number): RegionalDensity {
    // Check cache
    if (this.regionalCache.has(region)) {
      return this.regionalCache.get(region)!;
    }

    const regionalCompanies = this.companies.filter(c => c.region === region);

    if (regionalCompanies.length === 0) {
      throw new Error(`No data available for region: ${region}`);
    }

    // Calculate density (if population provided)
    const density = population ? regionalCompanies.length / population * 1000 : 0;

    // Find dominant industries
    const industryCounts: Record<string, number> = {};
    regionalCompanies.forEach(c => {
      industryCounts[c.industry] = (industryCounts[c.industry] || 0) + 1;
    });

    const dominantIndustries = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([industry]) => industry);

    // Calculate economic score (composite metric)
    const avgEmployees = this.calculateAvgEmployees(regionalCompanies);
    const avgRevenue = this.calculateAvgRevenue(regionalCompanies);
    const diversityScore = Object.keys(industryCounts).length / 10; // 10+ industries = max diversity

    const economicScore = Math.min(100, (
      (regionalCompanies.length / 100) * 30 + // Company count (max 30 points)
      (avgEmployees / 50) * 30 + // Avg employees (max 30 points)
      (avgRevenue / 1000000) * 20 + // Avg revenue (max 20 points)
      diversityScore * 20 // Industry diversity (max 20 points)
    ));

    const densityData: RegionalDensity = {
      region,
      companyCount: regionalCompanies.length,
      density,
      dominantIndustries,
      economicScore
    };

    this.regionalCache.set(region, densityData);
    return densityData;
  }

  /**
   * Gets all available industries
   */
  public getIndustries(): string[] {
    return Array.from(new Set(this.companies.map(c => c.industry)));
  }

  /**
   * Gets all available regions
   */
  public getRegions(): string[] {
    return Array.from(new Set(this.companies.map(c => c.region)));
  }

  // ===== PRIVATE HELPER METHODS =====

  private invalidateCaches(): void {
    this.industryCache.clear();
    this.regionalCache.clear();
  }

  private calculateAvgEmployees(companies: CompanyData[]): number {
    const withEmployees = companies.filter(c => c.employees !== undefined);
    if (withEmployees.length === 0) return 0;
    return withEmployees.reduce((sum, c) => sum + c.employees!, 0) / withEmployees.length;
  }

  private calculateAvgRevenue(companies: CompanyData[]): number {
    const withRevenue = companies.filter(c => c.revenue !== undefined);
    if (withRevenue.length === 0) return 0;
    return withRevenue.reduce((sum, c) => sum + c.revenue!, 0) / withRevenue.length;
  }
}
