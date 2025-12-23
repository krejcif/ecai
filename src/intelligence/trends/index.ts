/**
 * Trend Analysis Intelligence Module
 *
 * Provides comprehensive trend detection, demand forecasting, market signal analysis,
 * and category performance evaluation for e-commerce intelligence.
 */

// Trend Detector
export {
  TrendDetector,
  TrendPattern,
  SeasonalPattern,
  CrossCategoryCorrelation,
  TrendAnalysisResult,
} from './trend-detector';

// Demand Forecaster
export {
  DemandForecaster,
  ForecastPoint,
  SeasonalDecomposition,
  EconomicIndicators,
  ForecastConfig,
  DemandForecast,
} from './demand-forecaster';

// Market Signals
export {
  MarketSignalService,
  MarketSignal,
  SignalSource,
  SignalType,
  SignalWeight,
  AggregatedSignal,
  TrendScore,
  ActionableInsight,
} from './market-signals';

// Category Analyzer
export {
  CategoryAnalyzer,
  CategoryMetrics,
  CategoryHealth,
  OpportunityScore,
  MarketShareAnalysis,
  GrowthAnalysis,
} from './category-analyzer';

/**
 * Example Usage:
 *
 * ```typescript
 * import {
 *   TrendDetector,
 *   DemandForecaster,
 *   MarketSignalService,
 *   CategoryAnalyzer
 * } from './intelligence/trends';
 *
 * // Initialize services
 * const trendDetector = new TrendDetector();
 * const demandForecaster = new DemandForecaster();
 * const signalService = new MarketSignalService();
 * const categoryAnalyzer = new CategoryAnalyzer();
 *
 * // Detect trends
 * const trendAnalysis = await trendDetector.analyzeTrends(trendData);
 * console.log('Emerging trends:', trendAnalysis.emergingTrends);
 *
 * // Forecast demand
 * const forecast = await demandForecaster.forecastDemand(
 *   historicalData,
 *   { horizon: 30, includeSeasonality: true },
 *   economicIndicators
 * );
 * console.log('30-day forecast:', forecast.forecast);
 *
 * // Aggregate market signals
 * const signals = trendData.map(doc =>
 *   signalService.createSignalFromTrend(doc)
 * );
 * const aggregated = await signalService.aggregateSignals(signals);
 * const insights = await signalService.generateInsights(aggregated);
 * console.log('Actionable insights:', insights);
 *
 * // Analyze categories
 * const metrics = await categoryAnalyzer.analyzeCategoryMetrics(
 *   'electronics',
 *   categoryTrendData,
 *   allTrendData
 * );
 * const health = await categoryAnalyzer.analyzeCategoryHealth(
 *   'electronics',
 *   metrics,
 *   categoryTrendData
 * );
 * console.log('Category health:', health);
 * ```
 */
