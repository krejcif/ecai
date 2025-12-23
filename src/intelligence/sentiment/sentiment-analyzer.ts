/**
 * Sentiment Analyzer - Analyze product review sentiment
 */

import { ReviewDocument } from '../../database/collections';

export interface SentimentScore {
  overall: number; // -1 to 1
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
}

export interface AspectSentiment {
  aspect: string;
  score: number; // -1 to 1
  confidence: number;
  mentions: number;
  examples: string[];
}

export interface SentimentAnalysis {
  productId: string;
  overallSentiment: SentimentScore;
  aspectSentiments: AspectSentiment[];
  reviewCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  timestamp: string;
}

export interface SentimentTrend {
  productId: string;
  timePoints: {
    timestamp: string;
    sentiment: number;
    reviewCount: number;
  }[];
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number; // sentiment change per day
}

export class SentimentAnalyzer {
  private readonly positiveKeywords = [
    'excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'perfect',
    'love', 'best', 'awesome', 'superb', 'outstanding', 'impressive',
    'quality', 'recommend', 'worth', 'beautiful', 'fast', 'reliable'
  ];

  private readonly negativeKeywords = [
    'terrible', 'awful', 'horrible', 'worst', 'poor', 'bad',
    'disappointed', 'waste', 'broken', 'defective', 'useless', 'cheap',
    'slow', 'failed', 'never', 'regret', 'refund', 'problem'
  ];

  private readonly aspectKeywords: Record<string, string[]> = {
    quality: ['quality', 'durable', 'sturdy', 'build', 'material', 'craftsmanship'],
    price: ['price', 'expensive', 'cheap', 'affordable', 'value', 'cost', 'worth'],
    shipping: ['shipping', 'delivery', 'arrived', 'packaging', 'fast', 'slow'],
    customer_service: ['service', 'support', 'help', 'response', 'staff'],
    design: ['design', 'look', 'appearance', 'style', 'aesthetic', 'color'],
    performance: ['performance', 'work', 'function', 'speed', 'efficient']
  };

  /**
   * Analyze sentiment of a single review
   */
  analyzeSentiment(text: string): SentimentScore {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let signalCount = 0;

    // Count positive and negative keywords
    for (const word of words) {
      if (this.positiveKeywords.some(k => word.includes(k))) {
        score += 1;
        signalCount++;
      }
      if (this.negativeKeywords.some(k => word.includes(k))) {
        score -= 1;
        signalCount++;
      }
    }

    // Normalize score
    const normalizedScore = signalCount > 0
      ? Math.max(-1, Math.min(1, score / Math.sqrt(signalCount)))
      : 0;

    // Calculate confidence based on text length and signal count
    const confidence = Math.min(1, (signalCount / 10) * (Math.min(words.length, 100) / 100));

    // Determine label
    let label: 'positive' | 'negative' | 'neutral';
    if (normalizedScore > 0.2) {
      label = 'positive';
    } else if (normalizedScore < -0.2) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    return {
      overall: normalizedScore,
      confidence: Math.max(0.1, confidence),
      label
    };
  }

  /**
   * Analyze aspect-based sentiment from review
   */
  analyzeAspectSentiment(text: string, aspect: string): number {
    const lowerText = text.toLowerCase();
    const keywords = this.aspectKeywords[aspect] || [];

    // Find sentences mentioning the aspect
    const sentences = text.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return keywords.some(keyword => lower.includes(keyword));
    });

    if (relevantSentences.length === 0) {
      return 0; // No mention of this aspect
    }

    // Analyze sentiment of relevant sentences
    let totalScore = 0;
    for (const sentence of relevantSentences) {
      const sentiment = this.analyzeSentiment(sentence);
      totalScore += sentiment.overall;
    }

    return totalScore / relevantSentences.length;
  }

  /**
   * Aggregate sentiment scores for a product
   */
  aggregateSentiment(reviews: ReviewDocument[]): SentimentAnalysis {
    if (reviews.length === 0) {
      throw new Error('No reviews to analyze');
    }

    const productId = reviews[0].productId;
    const aspects = Object.keys(this.aspectKeywords);

    // Calculate overall sentiment
    let totalSentiment = 0;
    let totalConfidence = 0;
    let totalRating = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const review of reviews) {
      const sentiment = this.analyzeSentiment(review.text);
      totalSentiment += sentiment.overall;
      totalConfidence += sentiment.confidence;
      totalRating += review.rating;
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
    }

    const avgSentiment = totalSentiment / reviews.length;
    const avgConfidence = totalConfidence / reviews.length;

    // Calculate aspect sentiments
    const aspectSentiments: AspectSentiment[] = aspects.map(aspect => {
      const aspectScores: number[] = [];
      const examples: string[] = [];

      for (const review of reviews) {
        const score = this.analyzeAspectSentiment(review.text, aspect);
        if (score !== 0) {
          aspectScores.push(score);
          if (examples.length < 3) {
            examples.push(review.text.substring(0, 100) + '...');
          }
        }
      }

      const avgScore = aspectScores.length > 0
        ? aspectScores.reduce((a, b) => a + b, 0) / aspectScores.length
        : 0;

      return {
        aspect,
        score: avgScore,
        confidence: Math.min(1, aspectScores.length / reviews.length),
        mentions: aspectScores.length,
        examples
      };
    }).filter(a => a.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions);

    return {
      productId,
      overallSentiment: {
        overall: avgSentiment,
        confidence: avgConfidence,
        label: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral'
      },
      aspectSentiments,
      reviewCount: reviews.length,
      averageRating: totalRating / reviews.length,
      ratingDistribution,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Track sentiment changes over time
   */
  analyzeSentimentTrend(
    reviews: ReviewDocument[],
    timeWindowDays: number = 30
  ): SentimentTrend {
    if (reviews.length === 0) {
      throw new Error('No reviews to analyze');
    }

    const productId = reviews[0].productId;

    // Sort reviews by date
    const sortedReviews = reviews
      .filter(r => r.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    if (sortedReviews.length === 0) {
      throw new Error('No reviews with dates found');
    }

    // Group reviews by time windows
    const timePoints: { timestamp: string; sentiment: number; reviewCount: number }[] = [];
    const windowMs = timeWindowDays * 24 * 60 * 60 * 1000;

    const startTime = new Date(sortedReviews[0].date!).getTime();
    const endTime = new Date(sortedReviews[sortedReviews.length - 1].date!).getTime();

    for (let time = startTime; time <= endTime; time += windowMs) {
      const windowEnd = time + windowMs;
      const windowReviews = sortedReviews.filter(r => {
        const reviewTime = new Date(r.date!).getTime();
        return reviewTime >= time && reviewTime < windowEnd;
      });

      if (windowReviews.length > 0) {
        const avgSentiment = windowReviews
          .map(r => this.analyzeSentiment(r.text).overall)
          .reduce((a, b) => a + b, 0) / windowReviews.length;

        timePoints.push({
          timestamp: new Date(time).toISOString(),
          sentiment: avgSentiment,
          reviewCount: windowReviews.length
        });
      }
    }

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let changeRate = 0;

    if (timePoints.length >= 2) {
      const firstSentiment = timePoints[0].sentiment;
      const lastSentiment = timePoints[timePoints.length - 1].sentiment;
      const timeDiffDays = (new Date(timePoints[timePoints.length - 1].timestamp).getTime()
        - new Date(timePoints[0].timestamp).getTime()) / (24 * 60 * 60 * 1000);

      changeRate = (lastSentiment - firstSentiment) / timeDiffDays;

      if (changeRate > 0.01) {
        trend = 'improving';
      } else if (changeRate < -0.01) {
        trend = 'declining';
      }
    }

    return {
      productId,
      timePoints,
      trend,
      changeRate
    };
  }

  /**
   * Cluster similar reviews using vector embeddings
   */
  async clusterReviews(
    reviews: ReviewDocument[],
    numClusters: number = 5
  ): Promise<Map<number, ReviewDocument[]>> {
    // Simple clustering based on sentiment and rating
    // In production, this would use actual vector embeddings
    const clusters = new Map<number, ReviewDocument[]>();

    for (let i = 0; i < numClusters; i++) {
      clusters.set(i, []);
    }

    for (const review of reviews) {
      const sentiment = this.analyzeSentiment(review.text);
      // Assign to cluster based on sentiment and rating
      const clusterIndex = Math.floor(
        ((sentiment.overall + 1) / 2) * (numClusters - 1)
      );
      clusters.get(clusterIndex)?.push(review);
    }

    return clusters;
  }

  /**
   * Identify common patterns in reviews
   */
  identifyPatterns(reviews: ReviewDocument[]): {
    commonPhrases: { phrase: string; count: number; sentiment: number }[];
    commonIssues: string[];
    commonPraise: string[];
  } {
    const phraseMap = new Map<string, { count: number; sentiments: number[] }>();
    const issues: string[] = [];
    const praise: string[] = [];

    for (const review of reviews) {
      const sentiment = this.analyzeSentiment(review.text);
      const sentences = review.text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);

      for (const sentence of sentences) {
        // Track common phrases
        const normalized = sentence.toLowerCase();
        if (!phraseMap.has(normalized)) {
          phraseMap.set(normalized, { count: 0, sentiments: [] });
        }
        const entry = phraseMap.get(normalized)!;
        entry.count++;
        entry.sentiments.push(sentiment.overall);

        // Categorize as issue or praise
        if (sentiment.label === 'negative' && entry.count === 1) {
          issues.push(sentence);
        } else if (sentiment.label === 'positive' && entry.count === 1) {
          praise.push(sentence);
        }
      }
    }

    // Get common phrases (mentioned multiple times)
    const commonPhrases = Array.from(phraseMap.entries())
      .filter(([_, data]) => data.count >= 2)
      .map(([phrase, data]) => ({
        phrase,
        count: data.count,
        sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      commonPhrases,
      commonIssues: issues.slice(0, 5),
      commonPraise: praise.slice(0, 5)
    };
  }
}
