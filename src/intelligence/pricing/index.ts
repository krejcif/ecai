/**
 * Price Intelligence Module - Central Export
 *
 * This module provides comprehensive price intelligence capabilities including:
 * - Price tracking and historical analysis
 * - Market analysis and competitive pricing
 * - Price prediction and forecasting
 * - Price alerts and notifications
 */

// Price Tracker
import { PriceTracker, PricePoint, PriceHistory, PriceVelocity, PriceAnomaly, PriceTrackerConfig } from './price-tracker.js';
export { PriceTracker };
export type { PricePoint, PriceHistory, PriceVelocity, PriceAnomaly, PriceTrackerConfig };

// Price Analyzer
import { PriceAnalyzer, MarketStatistics, PricePosition, CompetitiveAnalysis, PriceRecommendation, ElasticityEstimate, PriceAnalyzerConfig } from './price-analyzer.js';
export { PriceAnalyzer };
export type { MarketStatistics, PricePosition, CompetitiveAnalysis, PriceRecommendation, ElasticityEstimate, PriceAnalyzerConfig };

// Price Predictor
import { PricePredictor, PricePrediction, SeasonalPattern, PricePattern, PredictorConfig } from './price-predictor.js';
export { PricePredictor };
export type { PricePrediction, SeasonalPattern, PricePattern, PredictorConfig };

// Price Alerts
import { PriceAlertService, PriceAlert, AlertCondition, AlertNotification, AlertDelivery, WebhookPayload, AlertServiceConfig } from './alerts.js';
export { PriceAlertService };
export type { PriceAlert, AlertCondition, AlertNotification, AlertDelivery, WebhookPayload, AlertServiceConfig };

/**
 * Create a complete price intelligence system
 *
 * @example
 * ```typescript
 * import { createPriceIntelligence } from './intelligence/pricing';
 * import { EmbeddingService } from './database/embeddings';
 *
 * const embeddings = new EmbeddingService();
 * const intelligence = createPriceIntelligence(embeddings);
 *
 * // Track prices
 * intelligence.tracker.trackPrice(productId, price, source);
 *
 * // Analyze market
 * const stats = intelligence.analyzer.calculateMarketStatistics('electronics');
 *
 * // Predict prices
 * const history = intelligence.tracker.getHistory(productId);
 * const predictions = intelligence.predictor.predictPrices(history);
 *
 * // Set up alerts
 * intelligence.alerts.createPriceDropAlert(productId, 10); // 10% drop
 * ```
 */
export interface PriceIntelligenceSystem {
  tracker: PriceTracker;
  analyzer: PriceAnalyzer;
  predictor: PricePredictor;
  alerts: PriceAlertService;
}

/**
 * Factory function to create a complete price intelligence system
 */
export function createPriceIntelligence(
  embeddings: any,
  config?: {
    tracker?: any;
    analyzer?: any;
    predictor?: any;
    alerts?: any;
  }
): PriceIntelligenceSystem {
  return {
    tracker: new PriceTracker(config?.tracker),
    analyzer: new PriceAnalyzer(embeddings, config?.analyzer),
    predictor: new PricePredictor(config?.predictor),
    alerts: new PriceAlertService(config?.alerts)
  };
}

/**
 * Default export for convenience
 */
export default {
  PriceTracker,
  PriceAnalyzer,
  PricePredictor,
  PriceAlertService,
  createPriceIntelligence
};
