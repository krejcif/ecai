/**
 * Insight Generator - Generate actionable insights from sentiment analysis
 */

import { ReviewDocument, TrendDocument } from '../../database/collections';
import { SentimentAnalyzer, SentimentAnalysis, SentimentTrend } from './sentiment-analyzer';
import { AspectExtractor, ProductAspect, ImprovementOpportunity } from './aspect-extractor';
import { ReviewProcessor } from './review-processor';

export interface ActionableInsight {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number; // 0 to 1
  confidence: number; // 0 to 1
  recommendations: string[];
  relatedAspects: string[];
  evidence: {
    reviewCount: number;
    sentimentScore: number;
    examples: string[];
  };
}

export interface ProductStrength {
  aspect: string;
  score: number;
  differentiator: boolean; // Is this a competitive advantage?
  consistency: number; // How consistent is this strength over time?
  recommendations: string[];
}

export interface ProductWeakness {
  aspect: string;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  frequency: number; // How often mentioned in reviews
  trend: 'worsening' | 'improving' | 'stable';
  recommendations: string[];
}

export interface CompetitorComparison {
  productId: string;
  competitorId: string;
  overallSentimentGap: number;
  aspectGaps: {
    aspect: string;
    gap: number; // Positive means we're ahead
    significance: number;
  }[];
  winningAspects: string[];
  losingAspects: string[];
  recommendations: string[];
}

export interface TrendCorrelation {
  trend: string;
  correlation: number; // -1 to 1
  sentimentImpact: number;
  insights: string[];
}

export interface SentimentReport {
  productId: string;
  timestamp: string;
  overallSentiment: SentimentAnalysis;
  strengths: ProductStrength[];
  weaknesses: ProductWeakness[];
  insights: ActionableInsight[];
  improvementOpportunities: ImprovementOpportunity[];
  trendAnalysis: SentimentTrend;
  summary: string;
}

export class InsightGenerator {
  private sentimentAnalyzer: SentimentAnalyzer;
  private aspectExtractor: AspectExtractor;
  private reviewProcessor: ReviewProcessor;

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.aspectExtractor = new AspectExtractor();
    this.reviewProcessor = new ReviewProcessor();
  }

  /**
   * Generate comprehensive insights from reviews
   */
  generateInsights(reviews: ReviewDocument[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Analyze overall sentiment
    const sentimentAnalysis = this.sentimentAnalyzer.aggregateSentiment(reviews);

    // Analyze aspects
    const aspects = this.aspectExtractor.calculateAspectScores(reviews);

    // Identify strengths
    const strongAspects = aspects.filter(a => a.sentimentScore > 0.5);
    for (const aspect of strongAspects.slice(0, 3)) {
      insights.push({
        id: `strength_${aspect.name}`,
        type: 'strength',
        title: `Strong Performance in ${aspect.name.replace(/_/g, ' ')}`,
        description: `Customers consistently praise ${aspect.name.replace(/_/g, ' ')} with ${(aspect.sentimentDistribution.positive * 100).toFixed(0)}% positive mentions.`,
        priority: 'high',
        impact: aspect.mentions / reviews.length,
        confidence: aspect.sentimentDistribution.positive,
        recommendations: [
          `Highlight ${aspect.name.replace(/_/g, ' ')} in marketing materials`,
          'Maintain current quality standards',
          'Use as competitive differentiator'
        ],
        relatedAspects: [aspect.name],
        evidence: {
          reviewCount: aspect.mentions,
          sentimentScore: aspect.sentimentScore,
          examples: aspect.examples.slice(0, 3).map(e => e.text)
        }
      });
    }

    // Identify weaknesses
    const weakAspects = aspects.filter(a => a.sentimentScore < -0.2);
    for (const aspect of weakAspects.slice(0, 3)) {
      const severity = this.calculateSeverity(aspect, reviews.length);

      insights.push({
        id: `weakness_${aspect.name}`,
        type: 'weakness',
        title: `Improvement Needed in ${aspect.name.replace(/_/g, ' ')}`,
        description: `${aspect.name.replace(/_/g, ' ')} is receiving negative feedback with ${(aspect.sentimentDistribution.negative * 100).toFixed(0)}% negative mentions.`,
        priority: severity,
        impact: aspect.mentions / reviews.length,
        confidence: aspect.sentimentDistribution.negative,
        recommendations: this.getAspectRecommendations(aspect),
        relatedAspects: [aspect.name],
        evidence: {
          reviewCount: aspect.mentions,
          sentimentScore: aspect.sentimentScore,
          examples: aspect.examples.filter(e => e.sentiment < 0).slice(0, 3).map(e => e.text)
        }
      });
    }

    // Identify opportunities
    const opportunities = this.identifyOpportunities(reviews, sentimentAnalysis);
    insights.push(...opportunities);

    // Identify threats
    const threats = this.identifyThreats(reviews, sentimentAnalysis);
    insights.push(...threats);

    return insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Identify product strengths
   */
  identifyStrengths(
    reviews: ReviewDocument[],
    competitorReviews?: Map<string, ReviewDocument[]>
  ): ProductStrength[] {
    const aspects = this.aspectExtractor.calculateAspectScores(reviews);
    const strengths: ProductStrength[] = [];

    for (const aspect of aspects) {
      if (aspect.sentimentScore < 0.4) continue; // Only consider positive aspects

      let differentiator = false;
      let consistency = aspect.sentimentDistribution.positive;

      // Check if this is a differentiator vs competitors
      if (competitorReviews) {
        const competitorScores: number[] = [];
        for (const [_, compReviews] of competitorReviews.entries()) {
          const compAspects = this.aspectExtractor.calculateAspectScores(compReviews);
          const compAspect = compAspects.find(a => a.name === aspect.name);
          if (compAspect) {
            competitorScores.push(compAspect.sentimentScore);
          }
        }

        const avgCompScore = competitorScores.length > 0
          ? competitorScores.reduce((a, b) => a + b, 0) / competitorScores.length
          : 0;

        differentiator = aspect.sentimentScore > avgCompScore + 0.2;
      }

      strengths.push({
        aspect: aspect.name,
        score: aspect.sentimentScore,
        differentiator,
        consistency,
        recommendations: [
          `Leverage ${aspect.name.replace(/_/g, ' ')} in marketing`,
          'Document best practices for maintaining this strength',
          differentiator ? 'Emphasize as key differentiator' : 'Monitor competitor improvements'
        ]
      });
    }

    return strengths.sort((a, b) => b.score - a.score);
  }

  /**
   * Identify product weaknesses
   */
  identifyWeaknesses(
    reviews: ReviewDocument[],
    historicalReviews?: ReviewDocument[]
  ): ProductWeakness[] {
    const aspects = this.aspectExtractor.calculateAspectScores(reviews);
    const weaknesses: ProductWeakness[] = [];

    for (const aspect of aspects) {
      if (aspect.sentimentScore > -0.1) continue; // Only consider negative aspects

      const severity = this.calculateSeverity(aspect, reviews.length);
      const frequency = aspect.mentions / reviews.length;

      let trend: 'worsening' | 'improving' | 'stable' = 'stable';

      // Check historical trend if available
      if (historicalReviews && historicalReviews.length > 0) {
        const historicalAspects = this.aspectExtractor.calculateAspectScores(historicalReviews);
        const historicalAspect = historicalAspects.find(a => a.name === aspect.name);

        if (historicalAspect) {
          const scoreDiff = aspect.sentimentScore - historicalAspect.sentimentScore;
          if (scoreDiff < -0.1) {
            trend = 'worsening';
          } else if (scoreDiff > 0.1) {
            trend = 'improving';
          }
        }
      }

      weaknesses.push({
        aspect: aspect.name,
        score: aspect.sentimentScore,
        severity,
        frequency,
        trend,
        recommendations: this.getAspectRecommendations(aspect)
      });
    }

    return weaknesses.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Compare sentiment with competitors
   */
  compareWithCompetitors(
    productReviews: ReviewDocument[],
    competitorReviews: Map<string, ReviewDocument[]>
  ): CompetitorComparison[] {
    const comparisons: CompetitorComparison[] = [];
    const productSentiment = this.sentimentAnalyzer.aggregateSentiment(productReviews);
    const productAspects = this.aspectExtractor.calculateAspectScores(productReviews);

    for (const [competitorId, compReviews] of competitorReviews.entries()) {
      const compSentiment = this.sentimentAnalyzer.aggregateSentiment(compReviews);
      const compAspects = this.aspectExtractor.calculateAspectScores(compReviews);

      const overallGap = productSentiment.overallSentiment.overall - compSentiment.overallSentiment.overall;

      // Compare aspects
      const aspectGaps: { aspect: string; gap: number; significance: number }[] = [];
      const winningAspects: string[] = [];
      const losingAspects: string[] = [];

      for (const aspect of productAspects) {
        const compAspect = compAspects.find(a => a.name === aspect.name);
        if (!compAspect) continue;

        const gap = aspect.sentimentScore - compAspect.sentimentScore;
        const significance = (aspect.mentions + compAspect.mentions) / (productReviews.length + compReviews.length);

        aspectGaps.push({ aspect: aspect.name, gap, significance });

        if (gap > 0.2) {
          winningAspects.push(aspect.name);
        } else if (gap < -0.2) {
          losingAspects.push(aspect.name);
        }
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (overallGap < 0) {
        recommendations.push('Conduct detailed competitive analysis');
        recommendations.push(`Focus on improving: ${losingAspects.slice(0, 3).join(', ')}`);
      } else {
        recommendations.push(`Leverage strengths: ${winningAspects.slice(0, 3).join(', ')}`);
        recommendations.push('Maintain competitive positioning');
      }

      if (losingAspects.length > 0) {
        recommendations.push(`Study competitor's approach to: ${losingAspects[0]}`);
      }

      comparisons.push({
        productId: productReviews[0].productId,
        competitorId,
        overallSentimentGap: overallGap,
        aspectGaps: aspectGaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)),
        winningAspects,
        losingAspects,
        recommendations
      });
    }

    return comparisons;
  }

  /**
   * Correlate sentiment with market trends
   */
  correlateTrends(
    reviews: ReviewDocument[],
    trends: TrendDocument[]
  ): TrendCorrelation[] {
    const correlations: TrendCorrelation[] = [];
    const reviewProcessor = this.reviewProcessor;

    for (const trend of trends) {
      // Find reviews mentioning the trend
      const relevantReviews = reviews.filter(review => {
        const processed = reviewProcessor.processReview(review);
        return processed.tokens.some(token =>
          trend.keyword.toLowerCase().includes(token) ||
          token.includes(trend.keyword.toLowerCase())
        );
      });

      if (relevantReviews.length < 3) continue;

      // Calculate sentiment for these reviews
      const sentiments = relevantReviews.map(r =>
        this.sentimentAnalyzer.analyzeSentiment(r.text).overall
      );
      const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

      // Calculate correlation (simplified)
      const correlation = trend.growth > 0 ? avgSentiment : -avgSentiment;

      const insights: string[] = [];
      if (correlation > 0.3 && trend.growth > 0.2) {
        insights.push(`Growing interest in "${trend.keyword}" correlates with positive sentiment`);
        insights.push('Consider expanding features related to this trend');
      } else if (correlation < -0.3 && trend.growth > 0.2) {
        insights.push(`Growing trend "${trend.keyword}" has negative sentiment association`);
        insights.push('Address concerns before trend becomes mainstream');
      }

      if (insights.length > 0) {
        correlations.push({
          trend: trend.keyword,
          correlation,
          sentimentImpact: Math.abs(avgSentiment),
          insights
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Generate comprehensive sentiment report
   */
  generateReport(
    reviews: ReviewDocument[],
    competitorReviews?: Map<string, ReviewDocument[]>,
    trends?: TrendDocument[]
  ): SentimentReport {
    const overallSentiment = this.sentimentAnalyzer.aggregateSentiment(reviews);
    const trendAnalysis = this.sentimentAnalyzer.analyzeSentimentTrend(reviews);
    const strengths = this.identifyStrengths(reviews, competitorReviews);
    const weaknesses = this.identifyWeaknesses(reviews);
    const insights = this.generateInsights(reviews);
    const improvementOpportunities = this.aspectExtractor.identifyImprovementOpportunities(
      this.aspectExtractor.calculateAspectScores(reviews),
      overallSentiment.overallSentiment.overall
    );

    // Generate summary
    const summary = this.generateSummary(
      overallSentiment,
      strengths,
      weaknesses,
      trendAnalysis
    );

    return {
      productId: reviews[0].productId,
      timestamp: new Date().toISOString(),
      overallSentiment,
      strengths,
      weaknesses,
      insights,
      improvementOpportunities,
      trendAnalysis,
      summary
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    sentiment: SentimentAnalysis,
    strengths: ProductStrength[],
    weaknesses: ProductWeakness[],
    trend: SentimentTrend
  ): string {
    const parts: string[] = [];

    // Overall sentiment
    const sentimentLabel = sentiment.overallSentiment.label;
    const sentimentScore = (sentiment.overallSentiment.overall * 100).toFixed(0);
    parts.push(`Overall sentiment is ${sentimentLabel} (${sentimentScore}/100) based on ${sentiment.reviewCount} reviews.`);

    // Trend
    parts.push(`Sentiment is ${trend.trend} with a ${trend.changeRate > 0 ? 'positive' : 'negative'} trend.`);

    // Top strengths
    if (strengths.length > 0) {
      const topStrengths = strengths.slice(0, 2).map(s => s.aspect.replace(/_/g, ' ')).join(' and ');
      parts.push(`Key strengths include ${topStrengths}.`);
    }

    // Top weaknesses
    if (weaknesses.length > 0) {
      const topWeakness = weaknesses[0].aspect.replace(/_/g, ' ');
      parts.push(`Primary concern is ${topWeakness}, which ${weaknesses[0].trend === 'worsening' ? 'is getting worse' : 'needs attention'}.`);
    }

    return parts.join(' ');
  }

  /**
   * Identify opportunities from sentiment data
   */
  private identifyOpportunities(
    reviews: ReviewDocument[],
    sentiment: SentimentAnalysis
  ): ActionableInsight[] {
    const opportunities: ActionableInsight[] = [];
    const patterns = this.sentimentAnalyzer.identifyPatterns(reviews);

    // Look for frequently requested features
    if (patterns.commonPhrases.length > 0) {
      const wishPhrases = patterns.commonPhrases.filter(p =>
        p.phrase.includes('wish') || p.phrase.includes('would be') || p.phrase.includes('need')
      );

      if (wishPhrases.length > 0) {
        opportunities.push({
          id: 'opportunity_feature_requests',
          type: 'opportunity',
          title: 'Customer Feature Requests Identified',
          description: `Customers are requesting specific features that could improve satisfaction.`,
          priority: 'medium',
          impact: 0.6,
          confidence: 0.7,
          recommendations: [
            'Review feature request patterns',
            'Prioritize most-requested features',
            'Communicate roadmap to customers'
          ],
          relatedAspects: ['features'],
          evidence: {
            reviewCount: wishPhrases.reduce((sum, p) => sum + p.count, 0),
            sentimentScore: 0,
            examples: wishPhrases.slice(0, 3).map(p => p.phrase)
          }
        });
      }
    }

    return opportunities;
  }

  /**
   * Identify threats from sentiment data
   */
  private identifyThreats(
    reviews: ReviewDocument[],
    sentiment: SentimentAnalysis
  ): ActionableInsight[] {
    const threats: ActionableInsight[] = [];

    // Check for quality issues
    const qualityAspect = sentiment.aspectSentiments.find(a => a.aspect === 'quality');
    if (qualityAspect && qualityAspect.score < -0.3) {
      threats.push({
        id: 'threat_quality',
        type: 'threat',
        title: 'Quality Concerns Emerging',
        description: 'Multiple customers reporting quality issues that could impact brand reputation.',
        priority: 'critical',
        impact: 0.9,
        confidence: qualityAspect.confidence,
        recommendations: [
          'Immediate quality audit required',
          'Review manufacturing processes',
          'Implement corrective actions'
        ],
        relatedAspects: ['quality'],
        evidence: {
          reviewCount: qualityAspect.mentions,
          sentimentScore: qualityAspect.score,
          examples: qualityAspect.examples.slice(0, 3)
        }
      });
    }

    return threats;
  }

  /**
   * Calculate severity of a weakness
   */
  private calculateSeverity(
    aspect: ProductAspect,
    totalReviews: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    const frequency = aspect.mentions / totalReviews;
    const negativity = aspect.sentimentDistribution.negative;

    if (aspect.sentimentScore < -0.5 && frequency > 0.3) {
      return 'critical';
    } else if (aspect.sentimentScore < -0.3 && frequency > 0.2) {
      return 'high';
    } else if (aspect.sentimentScore < -0.2 || frequency > 0.15) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get recommendations for an aspect
   */
  private getAspectRecommendations(aspect: ProductAspect): string[] {
    const recommendations: string[] = [];

    if (aspect.name === 'product_quality') {
      recommendations.push('Conduct quality control audit');
      recommendations.push('Review supplier standards');
    } else if (aspect.name === 'price_value') {
      recommendations.push('Analyze pricing strategy');
      recommendations.push('Enhance value proposition');
    } else if (aspect.name === 'shipping_delivery') {
      recommendations.push('Review logistics partners');
      recommendations.push('Improve packaging standards');
    } else if (aspect.name === 'customer_service') {
      recommendations.push('Enhance support training');
      recommendations.push('Reduce response times');
    } else {
      recommendations.push(`Improve ${aspect.name.replace(/_/g, ' ')}`);
      recommendations.push('Gather detailed customer feedback');
    }

    return recommendations;
  }
}
