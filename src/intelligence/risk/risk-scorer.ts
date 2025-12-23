/**
 * Risk Scorer - Comprehensive supplier risk assessment
 * Calculates multi-dimensional risk scores using location, economic, and trade data
 */

export interface RiskFactors {
  geoRisk: number;           // 0-100: Geographic/political risk
  economicRisk: number;      // 0-100: Economic stability risk
  tradeRisk: number;         // 0-100: Trade relationship risk
  operationalRisk: number;   // 0-100: Operational/performance risk
  financialRisk: number;     // 0-100: Financial stability risk
}

export interface RiskWeights {
  geo: number;
  economic: number;
  trade: number;
  operational: number;
  financial: number;
}

export interface SupplierRiskProfile {
  supplierId: string;
  supplierName: string;
  location: string;
  countryCode: string;
  overallScore: number;      // 0-100 (higher = higher risk)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactors;
  calculatedAt: string;
  confidence: number;        // 0-1: Confidence in assessment
  metadata?: Record<string, any>;
}

export interface EconomicIndicators {
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  currencyStability: number;
  debtToGdp: number;
  tradeBalance: number;
}

export interface TradeRelationship {
  partnerCountry: string;
  tradeVolume: number;
  tariffs: number;
  agreements: string[];
  restrictions: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export class RiskScorer {
  private readonly defaultWeights: RiskWeights = {
    geo: 0.25,
    economic: 0.25,
    trade: 0.20,
    operational: 0.15,
    financial: 0.15
  };

  constructor(private customWeights?: Partial<RiskWeights>) {}

  /**
   * Calculate comprehensive risk score for a supplier
   */
  calculateRiskScore(
    supplierId: string,
    supplierName: string,
    location: string,
    countryCode: string,
    factors: RiskFactors,
    confidence: number = 0.8
  ): SupplierRiskProfile {
    const weights = { ...this.defaultWeights, ...this.customWeights };

    // Normalize weights to sum to 1
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedWeights = {
      geo: weights.geo / totalWeight,
      economic: weights.economic / totalWeight,
      trade: weights.trade / totalWeight,
      operational: weights.operational / totalWeight,
      financial: weights.financial / totalWeight
    };

    // Calculate weighted overall score
    const overallScore =
      factors.geoRisk * normalizedWeights.geo +
      factors.economicRisk * normalizedWeights.economic +
      factors.tradeRisk * normalizedWeights.trade +
      factors.operationalRisk * normalizedWeights.operational +
      factors.financialRisk * normalizedWeights.financial;

    return {
      supplierId,
      supplierName,
      location,
      countryCode,
      overallScore: Math.round(overallScore * 100) / 100,
      riskLevel: this.getRiskLevel(overallScore),
      factors,
      calculatedAt: new Date().toISOString(),
      confidence,
      metadata: {
        weights: normalizedWeights
      }
    };
  }

  /**
   * Calculate location-based risk score
   * Factors: political stability, natural disasters, infrastructure
   */
  calculateLocationRisk(
    countryCode: string,
    politicalStability: number,  // 0-100
    naturalDisasterRisk: number, // 0-100
    infrastructureQuality: number // 0-100 (higher = better, inverted for risk)
  ): number {
    const infrastructureRisk = 100 - infrastructureQuality;

    // Weighted average
    const locationRisk =
      politicalStability * 0.4 +
      naturalDisasterRisk * 0.3 +
      infrastructureRisk * 0.3;

    return Math.min(100, Math.max(0, locationRisk));
  }

  /**
   * Calculate economic stability risk
   * Uses World Bank indicators and macroeconomic data
   */
  calculateEconomicRisk(indicators: EconomicIndicators): number {
    let riskScore = 0;

    // GDP Growth (negative growth increases risk)
    if (indicators.gdpGrowth < 0) {
      riskScore += 20;
    } else if (indicators.gdpGrowth < 2) {
      riskScore += 10;
    } else if (indicators.gdpGrowth > 6) {
      // Very high growth can also indicate instability
      riskScore += 5;
    }

    // Inflation (high inflation = high risk)
    if (indicators.inflation > 10) {
      riskScore += 25;
    } else if (indicators.inflation > 5) {
      riskScore += 15;
    } else if (indicators.inflation > 3) {
      riskScore += 5;
    }

    // Unemployment
    if (indicators.unemployment > 15) {
      riskScore += 15;
    } else if (indicators.unemployment > 10) {
      riskScore += 10;
    } else if (indicators.unemployment > 7) {
      riskScore += 5;
    }

    // Currency Stability (0-100, higher = more stable)
    const currencyRisk = 100 - indicators.currencyStability;
    riskScore += currencyRisk * 0.15;

    // Debt to GDP ratio
    if (indicators.debtToGdp > 100) {
      riskScore += 15;
    } else if (indicators.debtToGdp > 70) {
      riskScore += 10;
    } else if (indicators.debtToGdp > 50) {
      riskScore += 5;
    }

    // Trade Balance (negative = import dependent)
    if (indicators.tradeBalance < -10) {
      riskScore += 10;
    } else if (indicators.tradeBalance < -5) {
      riskScore += 5;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Calculate trade relationship risk
   * Considers bilateral trade, tariffs, and agreements
   */
  calculateTradeRisk(
    relationship: TradeRelationship,
    domesticCountry: string = 'US'
  ): number {
    let riskScore = 30; // Base risk

    // Trade volume (higher volume = lower risk through established relationship)
    if (relationship.tradeVolume > 100_000_000_000) { // >$100B
      riskScore -= 15;
    } else if (relationship.tradeVolume > 10_000_000_000) { // >$10B
      riskScore -= 10;
    } else if (relationship.tradeVolume > 1_000_000_000) { // >$1B
      riskScore -= 5;
    }

    // Tariff levels (higher tariffs = higher risk)
    riskScore += relationship.tariffs * 0.5;

    // Trade agreements (reduce risk)
    riskScore -= relationship.agreements.length * 5;

    // Trade restrictions (increase risk)
    riskScore += relationship.restrictions.length * 10;

    // Trend
    switch (relationship.trend) {
      case 'improving':
        riskScore -= 10;
        break;
      case 'stable':
        riskScore -= 0;
        break;
      case 'declining':
        riskScore += 15;
        break;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Calculate operational risk based on supplier performance
   */
  calculateOperationalRisk(
    onTimeDeliveryRate: number,  // 0-100
    qualityScore: number,         // 0-100
    responseTime: number,         // in hours
    certifications: string[]
  ): number {
    let riskScore = 0;

    // On-time delivery
    const deliveryRisk = 100 - onTimeDeliveryRate;
    riskScore += deliveryRisk * 0.4;

    // Quality
    const qualityRisk = 100 - qualityScore;
    riskScore += qualityRisk * 0.4;

    // Response time (>48 hours is concerning)
    if (responseTime > 48) {
      riskScore += 15;
    } else if (responseTime > 24) {
      riskScore += 10;
    } else if (responseTime > 12) {
      riskScore += 5;
    }

    // Certifications reduce risk (ISO, etc.)
    riskScore -= Math.min(15, certifications.length * 3);

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Calculate financial risk based on supplier financial health
   */
  calculateFinancialRisk(
    creditRating?: string,
    yearsInBusiness?: number,
    revenue?: number,
    profitMargin?: number
  ): number {
    let riskScore = 50; // Default medium risk if no data

    // Credit rating
    if (creditRating) {
      const ratingMap: Record<string, number> = {
        'AAA': 5, 'AA': 10, 'A': 15,
        'BBB': 30, 'BB': 50, 'B': 70,
        'CCC': 85, 'CC': 95, 'C': 100
      };
      riskScore = ratingMap[creditRating] ?? 50;
    }

    // Years in business (newer = riskier)
    if (yearsInBusiness !== undefined) {
      if (yearsInBusiness < 2) {
        riskScore += 20;
      } else if (yearsInBusiness < 5) {
        riskScore += 10;
      } else if (yearsInBusiness > 20) {
        riskScore -= 10;
      }
    }

    // Revenue size (larger = more stable)
    if (revenue !== undefined) {
      if (revenue < 1_000_000) {
        riskScore += 15;
      } else if (revenue > 100_000_000) {
        riskScore -= 10;
      }
    }

    // Profit margin
    if (profitMargin !== undefined) {
      if (profitMargin < 0) {
        riskScore += 25;
      } else if (profitMargin < 5) {
        riskScore += 10;
      } else if (profitMargin > 20) {
        riskScore -= 10;
      }
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Determine risk level category from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Compare two risk profiles
   */
  compareRiskProfiles(
    profile1: SupplierRiskProfile,
    profile2: SupplierRiskProfile
  ): {
    scoreDelta: number;
    factorDeltas: Partial<RiskFactors>;
    recommendation: string;
  } {
    const scoreDelta = profile2.overallScore - profile1.overallScore;

    const factorDeltas: Partial<RiskFactors> = {
      geoRisk: profile2.factors.geoRisk - profile1.factors.geoRisk,
      economicRisk: profile2.factors.economicRisk - profile1.factors.economicRisk,
      tradeRisk: profile2.factors.tradeRisk - profile1.factors.tradeRisk,
      operationalRisk: profile2.factors.operationalRisk - profile1.factors.operationalRisk,
      financialRisk: profile2.factors.financialRisk - profile1.factors.financialRisk
    };

    let recommendation = '';
    if (scoreDelta < -10) {
      recommendation = `${profile2.supplierName} has significantly lower risk (-${Math.abs(scoreDelta).toFixed(1)} points)`;
    } else if (scoreDelta > 10) {
      recommendation = `${profile1.supplierName} has significantly lower risk (-${scoreDelta.toFixed(1)} points)`;
    } else {
      recommendation = 'Both suppliers have similar risk profiles';
    }

    return {
      scoreDelta,
      factorDeltas,
      recommendation
    };
  }

  /**
   * Generate risk summary report
   */
  generateRiskSummary(profile: SupplierRiskProfile): string {
    const lines: string[] = [];
    lines.push(`Risk Assessment for ${profile.supplierName}`);
    lines.push(`Location: ${profile.location} (${profile.countryCode})`);
    lines.push(`Overall Risk: ${profile.overallScore.toFixed(1)}/100 (${profile.riskLevel.toUpperCase()})`);
    lines.push(`\nRisk Factors:`);
    lines.push(`  Geographic: ${profile.factors.geoRisk.toFixed(1)}/100`);
    lines.push(`  Economic: ${profile.factors.economicRisk.toFixed(1)}/100`);
    lines.push(`  Trade: ${profile.factors.tradeRisk.toFixed(1)}/100`);
    lines.push(`  Operational: ${profile.factors.operationalRisk.toFixed(1)}/100`);
    lines.push(`  Financial: ${profile.factors.financialRisk.toFixed(1)}/100`);
    lines.push(`\nConfidence: ${(profile.confidence * 100).toFixed(0)}%`);
    lines.push(`Assessed: ${profile.calculatedAt}`);

    return lines.join('\n');
  }
}
