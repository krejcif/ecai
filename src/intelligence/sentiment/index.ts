/**
 * Sentiment Analysis Module
 *
 * Comprehensive sentiment analysis system for product reviews including:
 * - Sentiment scoring and classification
 * - Review text processing and cleaning
 * - Aspect-based sentiment extraction
 * - Actionable insights generation
 * - Competitive analysis
 * - Trend correlation
 */

// Sentiment Analyzer
export {
  SentimentAnalyzer,
  type SentimentScore,
  type AspectSentiment,
  type SentimentAnalysis,
  type SentimentTrend
} from './sentiment-analyzer';

// Review Processor
export {
  ReviewProcessor,
  type ProcessedReview,
  type AuthenticitySignals,
  type ReviewMetrics
} from './review-processor';

// Aspect Extractor
export {
  AspectExtractor,
  type ProductAspect,
  type AspectCategory,
  type AspectComparison,
  type ImprovementOpportunity
} from './aspect-extractor';

// Insight Generator
export {
  InsightGenerator,
  type ActionableInsight,
  type ProductStrength,
  type ProductWeakness,
  type CompetitorComparison,
  type TrendCorrelation,
  type SentimentReport
} from './insight-generator';

/**
 * Example Usage:
 *
 * ```typescript
 * import {
 *   SentimentAnalyzer,
 *   ReviewProcessor,
 *   AspectExtractor,
 *   InsightGenerator
 * } from './intelligence/sentiment';
 *
 * // Initialize analyzers
 * const sentimentAnalyzer = new SentimentAnalyzer();
 * const reviewProcessor = new ReviewProcessor();
 * const aspectExtractor = new AspectExtractor();
 * const insightGenerator = new InsightGenerator();
 *
 * // Analyze sentiment
 * const analysis = sentimentAnalyzer.aggregateSentiment(reviews);
 *
 * // Process reviews
 * const processed = reviewProcessor.batchProcess(reviews);
 *
 * // Extract aspects
 * const aspects = aspectExtractor.calculateAspectScores(reviews);
 *
 * // Generate insights
 * const insights = insightGenerator.generateInsights(reviews);
 *
 * // Generate comprehensive report
 * const report = insightGenerator.generateReport(
 *   reviews,
 *   competitorReviews,
 *   trends
 * );
 * ```
 */
