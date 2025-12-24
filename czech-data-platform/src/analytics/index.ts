/**
 * Analytics Module Index
 * Exports all analytics components for easy importing
 */

// Export all from insightEngine
export {
  // Classes
  CzechEconomyAnalyzer,
  BusinessIntelligence,

  // Types and Interfaces
  ExchangeRate,
  TrendAnalysis,
  VolatilityPattern,
  RatePrediction,
  CompanyData,
  IndustryTrend,
  RegionalDensity
} from './insightEngine';

// Export all from reportGenerator
export {
  // Classes
  DailyEconomicReportGenerator,
  CurrencyAlertSystem,
  TrendVisualization,

  // Types and Interfaces
  DailyEconomicReport,
  CurrencyAlert,
  ChartDataPoint,
  TrendVisualizationData,
  AlertThresholds
} from './reportGenerator';

// Export all from aiAdvisor
export {
  // Classes
  CzechMarketAdvisor,

  // Functions
  createSampleAdvisor,

  // Types and Interfaces
  InvestmentTiming,
  CurrencyExchangeWindow,
  MarketSummary,
  AdvisorContext
} from './aiAdvisor';
