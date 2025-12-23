/**
 * Supply Chain Risk Analyzer
 * Analyzes supply chain vulnerabilities, dependencies, and identifies alternative suppliers
 * Uses vector similarity to find suppliers with different risk profiles
 */

import { SupplierRiskProfile } from './risk-scorer';

export interface SupplierNode {
  supplierId: string;
  name: string;
  location: string;
  countryCode: string;
  capabilities: string[];
  products: string[];
  leadTimeDays: number;
  capacity: number;
  currentUtilization: number; // 0-100%
  tier: 1 | 2 | 3;           // Tier 1 = direct, 2 = sub-supplier, etc.
}

export interface DependencyAnalysis {
  productId: string;
  productName: string;
  singleSourceRisk: number;           // 0-100
  supplierCount: number;
  primarySupplier: SupplierNode;
  alternativeSuppliers: SupplierNode[];
  concentrationRisk: number;          // 0-100 (how concentrated in one supplier)
  geographicDiversification: number;  // 0-100 (higher = better)
  recommendations: string[];
}

export interface LeadTimeAnalysis {
  supplierId: string;
  averageLeadTime: number;      // days
  minLeadTime: number;
  maxLeadTime: number;
  variance: number;             // standard deviation
  reliability: number;          // 0-100 (on-time delivery rate)
  seasonalFactors: {
    month: number;              // 1-12
    leadTimeMultiplier: number; // e.g., 1.2 = 20% longer
  }[];
  riskScore: number;            // 0-100
}

export interface AlternativeSupplier {
  supplier: SupplierNode;
  similarityScore: number;      // 0-1 (vector similarity)
  riskDelta: number;           // Difference in risk score (negative = lower risk)
  costDelta: number;           // Difference in cost (percentage)
  leadTimeDelta: number;       // Difference in lead time (days)
  overallScore: number;        // 0-100 (combined suitability score)
  switchingCost: number;       // Estimated cost to switch
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
}

export interface CostRiskTradeoff {
  supplierId: string;
  supplierName: string;
  cost: number;
  riskScore: number;
  efficiency: number;          // cost per unit of risk
  paretoOptimal: boolean;      // is this on the pareto frontier?
  dominatedBy: string[];       // IDs of suppliers that dominate this one
}

export interface SupplyChainRiskMetrics {
  overallChainRisk: number;    // 0-100
  singlePointsOfFailure: number;
  averageSupplierRisk: number;
  geographicConcentration: number;
  capacityReserve: number;     // Available capacity across all suppliers
  resilienceScore: number;     // 0-100 (higher = more resilient)
  assessedAt: string;
}

export class SupplyChainAnalyzer {
  private suppliers: Map<string, SupplierNode> = new Map();
  private supplierVectors: Map<string, number[]> = new Map();
  private riskProfiles: Map<string, SupplierRiskProfile> = new Map();

  constructor() {}

  /**
   * Register a supplier in the supply chain
   */
  registerSupplier(
    supplier: SupplierNode,
    vector?: number[],
    riskProfile?: SupplierRiskProfile
  ): void {
    this.suppliers.set(supplier.supplierId, supplier);

    if (vector) {
      this.supplierVectors.set(supplier.supplierId, vector);
    }

    if (riskProfile) {
      this.riskProfiles.set(supplier.supplierId, riskProfile);
    }
  }

  /**
   * Analyze single source dependency risk
   */
  analyzeDependency(
    productId: string,
    productName: string,
    supplierIds: string[]
  ): DependencyAnalysis {
    const suppliers = supplierIds
      .map(id => this.suppliers.get(id))
      .filter(s => s !== undefined) as SupplierNode[];

    if (suppliers.length === 0) {
      throw new Error(`No suppliers found for product ${productId}`);
    }

    // Calculate concentration (Herfindahl-Hirschman Index)
    const totalCapacity = suppliers.reduce((sum, s) => sum + s.capacity, 0);
    const marketShares = suppliers.map(s => s.capacity / totalCapacity);
    const hhi = marketShares.reduce((sum, share) => sum + share * share, 0);
    const concentrationRisk = hhi * 100; // 0-100

    // Single source risk
    const singleSourceRisk = suppliers.length === 1 ? 100 :
      suppliers.length === 2 ? 70 :
      suppliers.length === 3 ? 40 : 20;

    // Geographic diversification
    const uniqueCountries = new Set(suppliers.map(s => s.countryCode));
    const geographicDiversification = Math.min(100, (uniqueCountries.size / Math.max(3, suppliers.length)) * 100);

    // Sort by capacity to identify primary
    const sortedSuppliers = [...suppliers].sort((a, b) => b.capacity - a.capacity);
    const primarySupplier = sortedSuppliers[0];
    const alternativeSuppliers = sortedSuppliers.slice(1);

    // Generate recommendations
    const recommendations: string[] = [];
    if (singleSourceRisk > 70) {
      recommendations.push('CRITICAL: Identify alternative suppliers immediately');
    }
    if (concentrationRisk > 70) {
      recommendations.push('HIGH: Reduce concentration with primary supplier');
    }
    if (geographicDiversification < 50) {
      recommendations.push('Diversify supplier locations to reduce geographic risk');
    }
    if (uniqueCountries.size === 1) {
      recommendations.push('All suppliers in same country - consider international alternatives');
    }

    return {
      productId,
      productName,
      singleSourceRisk,
      supplierCount: suppliers.length,
      primarySupplier,
      alternativeSuppliers,
      concentrationRisk,
      geographicDiversification,
      recommendations
    };
  }

  /**
   * Analyze lead time risk for a supplier
   */
  analyzeLeadTime(
    supplierId: string,
    historicalLeadTimes: number[],
    onTimeDeliveryRate: number
  ): LeadTimeAnalysis {
    if (historicalLeadTimes.length === 0) {
      throw new Error('No historical lead time data provided');
    }

    const average = historicalLeadTimes.reduce((a, b) => a + b, 0) / historicalLeadTimes.length;
    const min = Math.min(...historicalLeadTimes);
    const max = Math.max(...historicalLeadTimes);

    // Calculate variance
    const squaredDiffs = historicalLeadTimes.map(lt => Math.pow(lt - average, 2));
    const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / historicalLeadTimes.length);

    // Calculate risk score
    let riskScore = 0;

    // Long average lead time increases risk
    if (average > 60) {
      riskScore += 30;
    } else if (average > 30) {
      riskScore += 15;
    }

    // High variance increases risk
    const coefficientOfVariation = variance / average;
    if (coefficientOfVariation > 0.3) {
      riskScore += 30;
    } else if (coefficientOfVariation > 0.2) {
      riskScore += 20;
    } else if (coefficientOfVariation > 0.1) {
      riskScore += 10;
    }

    // Poor reliability increases risk
    const reliabilityRisk = (100 - onTimeDeliveryRate) * 0.4;
    riskScore += reliabilityRisk;

    // Sample seasonal factors (in production, calculate from historical data)
    const seasonalFactors = [
      { month: 1, leadTimeMultiplier: 1.1 },   // January (post-holiday)
      { month: 11, leadTimeMultiplier: 1.3 },  // November (holiday prep)
      { month: 12, leadTimeMultiplier: 1.4 }   // December (holidays)
    ];

    return {
      supplierId,
      averageLeadTime: Math.round(average * 10) / 10,
      minLeadTime: min,
      maxLeadTime: max,
      variance: Math.round(variance * 10) / 10,
      reliability: onTimeDeliveryRate,
      seasonalFactors,
      riskScore: Math.min(100, Math.max(0, riskScore))
    };
  }

  /**
   * Find alternative suppliers using vector similarity
   * Identifies suppliers with similar capabilities but different risk profiles
   */
  findAlternativeSuppliers(
    currentSupplierId: string,
    targetVector: number[],
    topK: number = 5,
    minSimilarity: number = 0.7
  ): AlternativeSupplier[] {
    const currentSupplier = this.suppliers.get(currentSupplierId);
    const currentRiskProfile = this.riskProfiles.get(currentSupplierId);

    if (!currentSupplier) {
      throw new Error(`Supplier ${currentSupplierId} not found`);
    }

    const alternatives: AlternativeSupplier[] = [];

    // Calculate similarity with all other suppliers
    for (const [supplierId, supplier] of this.suppliers) {
      if (supplierId === currentSupplierId) continue;

      const supplierVector = this.supplierVectors.get(supplierId);
      if (!supplierVector) continue;

      const similarity = this.cosineSimilarity(targetVector, supplierVector);

      if (similarity < minSimilarity) continue;

      const riskProfile = this.riskProfiles.get(supplierId);
      const riskDelta = riskProfile && currentRiskProfile
        ? riskProfile.overallScore - currentRiskProfile.overallScore
        : 0;

      // Estimate cost delta (in production, use actual pricing data)
      const costDelta = this.estimateCostDelta(currentSupplier, supplier);

      // Lead time delta
      const leadTimeDelta = supplier.leadTimeDays - currentSupplier.leadTimeDays;

      // Calculate switching cost
      const switchingCost = this.estimateSwitchingCost(currentSupplier, supplier);

      // Overall score (higher similarity, lower risk = better)
      const overallScore = this.calculateAlternativeScore(
        similarity,
        riskDelta,
        costDelta,
        leadTimeDelta,
        switchingCost
      );

      alternatives.push({
        supplier,
        similarityScore: similarity,
        riskDelta,
        costDelta,
        leadTimeDelta,
        overallScore,
        switchingCost,
        recommendation: this.getRecommendation(overallScore, riskDelta)
      });
    }

    // Sort by overall score and return top K
    return alternatives
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Estimate cost delta between suppliers
   */
  private estimateCostDelta(current: SupplierNode, alternative: SupplierNode): number {
    // Simplified model - in production, use actual pricing data
    let delta = 0;

    // Different countries may have different labor costs
    if (current.countryCode !== alternative.countryCode) {
      const costIndexMap: Record<string, number> = {
        'CN': 0.8,
        'VN': 0.7,
        'IN': 0.75,
        'US': 1.3,
        'DE': 1.2
      };

      const currentCost = costIndexMap[current.countryCode] ?? 1.0;
      const altCost = costIndexMap[alternative.countryCode] ?? 1.0;
      delta = ((altCost - currentCost) / currentCost) * 100;
    }

    return Math.round(delta * 100) / 100;
  }

  /**
   * Estimate switching cost
   */
  private estimateSwitchingCost(current: SupplierNode, alternative: SupplierNode): number {
    let cost = 10000; // Base switching cost

    // Different tier increases cost
    if (current.tier !== alternative.tier) {
      cost += 5000;
    }

    // Different country increases cost (certifications, legal, etc.)
    if (current.countryCode !== alternative.countryCode) {
      cost += 15000;
    }

    // Technology/capability gap
    const capabilityOverlap = current.capabilities.filter(
      cap => alternative.capabilities.includes(cap)
    ).length;

    const capabilityGap = current.capabilities.length - capabilityOverlap;
    cost += capabilityGap * 2000;

    return cost;
  }

  /**
   * Calculate overall suitability score for alternative
   */
  private calculateAlternativeScore(
    similarity: number,
    riskDelta: number,
    costDelta: number,
    leadTimeDelta: number,
    switchingCost: number
  ): number {
    let score = 0;

    // Similarity (0-40 points)
    score += similarity * 40;

    // Risk improvement (0-30 points, negative delta = lower risk = better)
    if (riskDelta < 0) {
      score += Math.min(30, Math.abs(riskDelta) * 0.5);
    } else {
      score -= Math.min(20, riskDelta * 0.3);
    }

    // Cost (0-15 points, lower = better)
    if (costDelta <= 0) {
      score += 15; // Same or lower cost
    } else if (costDelta < 10) {
      score += 10; // Slight cost increase acceptable
    } else if (costDelta < 20) {
      score += 5;
    }

    // Lead time (0-10 points)
    if (leadTimeDelta <= 0) {
      score += 10; // Same or faster
    } else if (leadTimeDelta < 7) {
      score += 5;
    }

    // Switching cost (0-5 points)
    if (switchingCost < 20000) {
      score += 5;
    } else if (switchingCost < 40000) {
      score += 3;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get recommendation level
   */
  private getRecommendation(
    overallScore: number,
    riskDelta: number
  ): 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended' {
    if (overallScore > 75 && riskDelta < -10) {
      return 'highly_recommended';
    } else if (overallScore > 60 && riskDelta < 0) {
      return 'recommended';
    } else if (overallScore > 50) {
      return 'consider';
    }
    return 'not_recommended';
  }

  /**
   * Analyze cost-risk tradeoffs across suppliers
   * Identifies pareto-optimal suppliers
   */
  analyzeCostRiskTradeoff(
    supplierIds: string[],
    costMap: Map<string, number>
  ): CostRiskTradeoff[] {
    const tradeoffs: CostRiskTradeoff[] = [];

    for (const supplierId of supplierIds) {
      const supplier = this.suppliers.get(supplierId);
      const riskProfile = this.riskProfiles.get(supplierId);
      const cost = costMap.get(supplierId);

      if (!supplier || !riskProfile || cost === undefined) continue;

      const efficiency = cost / Math.max(1, riskProfile.overallScore);

      tradeoffs.push({
        supplierId,
        supplierName: supplier.name,
        cost,
        riskScore: riskProfile.overallScore,
        efficiency,
        paretoOptimal: false,
        dominatedBy: []
      });
    }

    // Identify pareto-optimal suppliers
    for (let i = 0; i < tradeoffs.length; i++) {
      const current = tradeoffs[i];
      let isDominated = false;

      for (let j = 0; j < tradeoffs.length; j++) {
        if (i === j) continue;

        const other = tradeoffs[j];

        // A supplier is dominated if another has both lower cost AND lower risk
        if (other.cost <= current.cost && other.riskScore <= current.riskScore) {
          if (other.cost < current.cost || other.riskScore < current.riskScore) {
            isDominated = true;
            current.dominatedBy.push(other.supplierId);
          }
        }
      }

      current.paretoOptimal = !isDominated;
    }

    return tradeoffs.sort((a, b) => a.efficiency - b.efficiency);
  }

  /**
   * Calculate overall supply chain risk metrics
   */
  calculateSupplyChainMetrics(
    productSupplierMap: Map<string, string[]>
  ): SupplyChainRiskMetrics {
    const allSupplierIds = new Set<string>();
    productSupplierMap.forEach(suppliers => suppliers.forEach(id => allSupplierIds.add(id)));

    const suppliers = Array.from(allSupplierIds)
      .map(id => this.suppliers.get(id))
      .filter(s => s !== undefined) as SupplierNode[];

    const riskProfiles = Array.from(allSupplierIds)
      .map(id => this.riskProfiles.get(id))
      .filter(r => r !== undefined) as SupplierRiskProfile[];

    // Count single points of failure
    let singlePointsOfFailure = 0;
    productSupplierMap.forEach((suppliers) => {
      if (suppliers.length === 1) {
        singlePointsOfFailure++;
      }
    });

    // Average supplier risk
    const averageSupplierRisk = riskProfiles.length > 0
      ? riskProfiles.reduce((sum, r) => sum + r.overallScore, 0) / riskProfiles.length
      : 50;

    // Geographic concentration (inverse of diversity)
    const uniqueCountries = new Set(suppliers.map(s => s.countryCode));
    const geographicConcentration = 100 - Math.min(100, (uniqueCountries.size / Math.max(5, suppliers.length)) * 100);

    // Capacity reserve
    const totalCapacity = suppliers.reduce((sum, s) => sum + s.capacity, 0);
    const usedCapacity = suppliers.reduce((sum, s) => sum + (s.capacity * s.currentUtilization / 100), 0);
    const capacityReserve = totalCapacity - usedCapacity;

    // Overall chain risk
    const overallChainRisk = (
      (singlePointsOfFailure / Math.max(1, productSupplierMap.size)) * 30 +
      averageSupplierRisk * 0.4 +
      geographicConcentration * 0.3
    );

    // Resilience score (inverse of risk)
    const resilienceScore = 100 - overallChainRisk;

    return {
      overallChainRisk: Math.round(overallChainRisk * 10) / 10,
      singlePointsOfFailure,
      averageSupplierRisk: Math.round(averageSupplierRisk * 10) / 10,
      geographicConcentration: Math.round(geographicConcentration * 10) / 10,
      capacityReserve,
      resilienceScore: Math.round(resilienceScore * 10) / 10,
      assessedAt: new Date().toISOString()
    };
  }
}
