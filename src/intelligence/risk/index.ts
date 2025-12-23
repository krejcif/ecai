/**
 * Risk Analysis System - Main Export Module
 *
 * Comprehensive supplier risk analysis for e-commerce intelligence
 * Integrates geographic risk, supply chain analysis, and real-time monitoring
 */

// Risk Scorer exports
import { RiskScorer, RiskFactors, RiskWeights, SupplierRiskProfile, EconomicIndicators, TradeRelationship } from './risk-scorer.js';
export { RiskScorer };
export type { RiskFactors, RiskWeights, SupplierRiskProfile, EconomicIndicators, TradeRelationship };

// Geographic Risk exports
import { GeoRiskAnalyzer, CountryRiskData, NaturalDisasterRisk, CurrencyRiskData, GeoPoliticalEvent, GeoRiskAssessment } from './geo-risk.js';
export { GeoRiskAnalyzer };
export type { CountryRiskData, NaturalDisasterRisk, CurrencyRiskData, GeoPoliticalEvent, GeoRiskAssessment };

// Supply Chain Analysis exports
import { SupplyChainAnalyzer, SupplierNode, DependencyAnalysis, LeadTimeAnalysis, AlternativeSupplier, CostRiskTradeoff, SupplyChainRiskMetrics } from './supply-chain.js';
export { SupplyChainAnalyzer };
export type { SupplierNode, DependencyAnalysis, LeadTimeAnalysis, AlternativeSupplier, CostRiskTradeoff, SupplyChainRiskMetrics };

// Risk Monitoring exports
import { RiskMonitoring, RiskAlert, RiskThreshold, RiskTrend, DashboardMetrics, MonitoringConfig } from './monitoring.js';
export { RiskMonitoring };
export type { RiskAlert, RiskThreshold, RiskTrend, DashboardMetrics, MonitoringConfig };

/**
 * Create a complete risk analysis system
 *
 * Example usage:
 * ```typescript
 * import { createRiskSystem } from './intelligence/risk';
 *
 * const riskSystem = createRiskSystem();
 *
 * // Assess a supplier
 * const geoRisk = await riskSystem.geoAnalyzer.assessCountryRisk('CN');
 * const riskProfile = riskSystem.scorer.calculateRiskScore(
 *   'SUP001',
 *   'Acme Manufacturing',
 *   'Shanghai, China',
 *   'CN',
 *   {
 *     geoRisk: geoRisk.overallGeoRisk,
 *     economicRisk: 35,
 *     tradeRisk: 40,
 *     operationalRisk: 25,
 *     financialRisk: 30
 *   }
 * );
 *
 * // Monitor risk changes
 * riskSystem.monitor.updateRiskScore(riskProfile);
 *
 * // Find alternatives
 * const alternatives = riskSystem.supplyChain.findAlternativeSuppliers(
 *   'SUP001',
 *   supplierVector,
 *   5
 * );
 * ```
 */
export interface RiskAnalysisSystem {
  scorer: RiskScorer;
  geoAnalyzer: GeoRiskAnalyzer;
  supplyChain: SupplyChainAnalyzer;
  monitor: RiskMonitoring;
}

/**
 * Create a complete risk analysis system with all components
 */
export function createRiskSystem(
  scorerWeights?: Partial<RiskWeights>,
  monitoringConfig?: Partial<MonitoringConfig>
): RiskAnalysisSystem {
  return {
    scorer: new RiskScorer(scorerWeights),
    geoAnalyzer: new GeoRiskAnalyzer(),
    supplyChain: new SupplyChainAnalyzer(),
    monitor: new RiskMonitoring(monitoringConfig)
  };
}

/**
 * Utility function to assess complete supplier risk
 * Combines all risk factors into a comprehensive assessment
 */
export async function assessCompleteSupplierRisk(
  system: RiskAnalysisSystem,
  supplier: SupplierNode,
  economicIndicators: EconomicIndicators,
  tradeRelationship: TradeRelationship,
  operationalMetrics: {
    onTimeDeliveryRate: number;
    qualityScore: number;
    responseTime: number;
    certifications: string[];
  },
  financialMetrics?: {
    creditRating?: string;
    yearsInBusiness?: number;
    revenue?: number;
    profitMargin?: number;
  }
): Promise<{
  riskProfile: SupplierRiskProfile;
  geoAssessment: GeoRiskAssessment;
  alerts: RiskAlert[];
}> {
  // Get geographic risk
  const geoAssessment = await system.geoAnalyzer.assessCountryRisk(supplier.countryCode);

  // Calculate all risk factors
  const geoRisk = geoAssessment.overallGeoRisk;
  const economicRisk = system.scorer.calculateEconomicRisk(economicIndicators);
  const tradeRisk = system.scorer.calculateTradeRisk(tradeRelationship);
  const operationalRisk = system.scorer.calculateOperationalRisk(
    operationalMetrics.onTimeDeliveryRate,
    operationalMetrics.qualityScore,
    operationalMetrics.responseTime,
    operationalMetrics.certifications
  );
  const financialRisk = system.scorer.calculateFinancialRisk(
    financialMetrics?.creditRating,
    financialMetrics?.yearsInBusiness,
    financialMetrics?.revenue,
    financialMetrics?.profitMargin
  );

  // Calculate overall risk profile
  const riskProfile = system.scorer.calculateRiskScore(
    supplier.supplierId,
    supplier.name,
    supplier.location,
    supplier.countryCode,
    {
      geoRisk,
      economicRisk,
      tradeRisk,
      operationalRisk,
      financialRisk
    }
  );

  // Update monitoring and check for alerts
  const alerts = system.monitor.updateRiskScore(riskProfile);

  return {
    riskProfile,
    geoAssessment,
    alerts
  };
}

/**
 * Utility function to compare two suppliers
 */
export async function compareSuppliers(
  system: RiskAnalysisSystem,
  supplier1Id: string,
  supplier2Id: string
): Promise<{
  supplier1: SupplierRiskProfile | undefined;
  supplier2: SupplierRiskProfile | undefined;
  comparison: {
    scoreDelta: number;
    factorDeltas: Partial<RiskFactors>;
    recommendation: string;
  } | null;
  geoComparison: {
    lowerRiskCountry: string;
    riskDifference: number;
    componentComparison: Record<string, number>;
  } | null;
}> {
  // This would typically fetch from a database or cache
  // For now, return structure showing how to use the comparison methods

  return {
    supplier1: undefined,
    supplier2: undefined,
    comparison: null,
    geoComparison: null
  };
}

/**
 * Default export: factory function for creating risk system
 */
export default createRiskSystem;
