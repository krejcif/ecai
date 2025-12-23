/**
 * Aspect Extractor - Extract product aspects from reviews and analyze aspect-based sentiment
 */

import { ReviewDocument } from '../../database/collections';
import { SentimentAnalyzer } from './sentiment-analyzer';
import { ReviewProcessor } from './review-processor';

export interface ProductAspect {
  name: string;
  category: string;
  mentions: number;
  sentimentScore: number; // -1 to 1
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  relatedTerms: string[];
  examples: {
    text: string;
    sentiment: number;
    rating: number;
  }[];
}

export interface AspectCategory {
  category: string;
  aspects: ProductAspect[];
  overallScore: number;
  importance: number; // Based on mention frequency
}

export interface AspectComparison {
  aspect: string;
  productScores: Map<string, number>;
  leader: string;
  gap: number; // Difference between leader and others
}

export interface ImprovementOpportunity {
  aspect: string;
  category: string;
  currentScore: number;
  potentialImpact: number; // How much it could improve overall sentiment
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
}

export class AspectExtractor {
  private sentimentAnalyzer: SentimentAnalyzer;
  private reviewProcessor: ReviewProcessor;

  private readonly aspectCategories: Record<string, string[]> = {
    product_quality: [
      'quality', 'durable', 'durability', 'sturdy', 'build', 'material',
      'materials', 'craftsmanship', 'construction', 'solid', 'reliable'
    ],
    price_value: [
      'price', 'expensive', 'cheap', 'affordable', 'value', 'cost',
      'worth', 'overpriced', 'reasonable', 'budget', 'deal'
    ],
    shipping_delivery: [
      'shipping', 'delivery', 'arrived', 'packaging', 'package', 'ship',
      'delivered', 'late', 'fast', 'quick', 'slow', 'damaged'
    ],
    customer_service: [
      'service', 'support', 'help', 'response', 'staff', 'representative',
      'customer', 'helpful', 'friendly', 'rude', 'responsive'
    ],
    design_appearance: [
      'design', 'look', 'looks', 'appearance', 'style', 'aesthetic',
      'color', 'beautiful', 'ugly', 'attractive', 'modern', 'sleek'
    ],
    performance: [
      'performance', 'work', 'works', 'function', 'speed', 'efficient',
      'effective', 'fast', 'slow', 'powerful', 'weak'
    ],
    ease_of_use: [
      'easy', 'simple', 'difficult', 'hard', 'complicated', 'intuitive',
      'user-friendly', 'complex', 'straightforward', 'convenient'
    ],
    features: [
      'feature', 'features', 'functionality', 'capability', 'option',
      'options', 'settings', 'versatile', 'basic', 'advanced'
    ],
    size_fit: [
      'size', 'fit', 'fits', 'large', 'small', 'big', 'compact',
      'dimension', 'dimensions', 'space', 'fitting'
    ],
    comfort: [
      'comfort', 'comfortable', 'uncomfortable', 'cozy', 'ergonomic',
      'soft', 'hard', 'cushion', 'padding', 'feel'
    ]
  };

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.reviewProcessor = new ReviewProcessor();
  }

  /**
   * Extract aspects from a single review
   */
  extractAspectsFromReview(review: ReviewDocument): string[] {
    const processed = this.reviewProcessor.processReview(review);
    const aspects: string[] = [];

    for (const [category, terms] of Object.entries(this.aspectCategories)) {
      for (const term of terms) {
        if (processed.tokens.includes(term)) {
          aspects.push(category);
          break; // Only add category once
        }
      }
    }

    return [...new Set(aspects)];
  }

  /**
   * Map aspect terms to categories
   */
  mapAspectToCategory(aspect: string): string {
    const lowerAspect = aspect.toLowerCase();

    for (const [category, terms] of Object.entries(this.aspectCategories)) {
      if (terms.includes(lowerAspect)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Calculate aspect sentiment scores from reviews
   */
  calculateAspectScores(reviews: ReviewDocument[]): ProductAspect[] {
    const aspectMap = new Map<string, {
      mentions: number[];
      sentiments: number[];
      examples: { text: string; sentiment: number; rating: number }[];
      relatedTerms: Set<string>;
    }>();

    // Initialize all categories
    for (const category of Object.keys(this.aspectCategories)) {
      aspectMap.set(category, {
        mentions: [],
        sentiments: [],
        examples: [],
        relatedTerms: new Set()
      });
    }

    // Process each review
    for (const review of reviews) {
      const processed = this.reviewProcessor.processReview(review);
      const sentences = processed.sentences;

      for (const [category, terms] of Object.entries(this.aspectCategories)) {
        const relevantSentences = sentences.filter(sentence => {
          const lower = sentence.toLowerCase();
          return terms.some(term => lower.includes(term));
        });

        if (relevantSentences.length > 0) {
          const aspectData = aspectMap.get(category)!;

          for (const sentence of relevantSentences) {
            const sentiment = this.sentimentAnalyzer.analyzeSentiment(sentence);
            aspectData.sentiments.push(sentiment.overall);

            // Find which specific term was mentioned
            const mentionedTerm = terms.find(term =>
              sentence.toLowerCase().includes(term)
            );
            if (mentionedTerm) {
              aspectData.relatedTerms.add(mentionedTerm);
            }
          }

          aspectData.mentions.push(review.rating);

          // Add example if we don't have many yet
          if (aspectData.examples.length < 3) {
            const sentiment = this.sentimentAnalyzer.analyzeSentiment(
              relevantSentences[0]
            );
            aspectData.examples.push({
              text: relevantSentences[0],
              sentiment: sentiment.overall,
              rating: review.rating
            });
          }
        }
      }
    }

    // Convert to ProductAspect array
    const aspects: ProductAspect[] = [];

    for (const [category, data] of aspectMap.entries()) {
      if (data.mentions.length === 0) continue;

      const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length;

      // Calculate sentiment distribution
      const positive = data.sentiments.filter(s => s > 0.2).length;
      const negative = data.sentiments.filter(s => s < -0.2).length;
      const neutral = data.sentiments.length - positive - negative;

      aspects.push({
        name: category,
        category: category,
        mentions: data.mentions.length,
        sentimentScore: avgSentiment,
        sentimentDistribution: {
          positive: positive / data.sentiments.length,
          neutral: neutral / data.sentiments.length,
          negative: negative / data.sentiments.length
        },
        relatedTerms: Array.from(data.relatedTerms).slice(0, 5),
        examples: data.examples
      });
    }

    return aspects.sort((a, b) => b.mentions - a.mentions);
  }

  /**
   * Group aspects by category
   */
  groupAspectsByCategory(aspects: ProductAspect[]): AspectCategory[] {
    const categoryMap = new Map<string, ProductAspect[]>();

    for (const aspect of aspects) {
      if (!categoryMap.has(aspect.category)) {
        categoryMap.set(aspect.category, []);
      }
      categoryMap.get(aspect.category)!.push(aspect);
    }

    const categories: AspectCategory[] = [];
    const totalMentions = aspects.reduce((sum, a) => sum + a.mentions, 0);

    for (const [category, categoryAspects] of categoryMap.entries()) {
      const categoryMentions = categoryAspects.reduce((sum, a) => sum + a.mentions, 0);
      const avgScore = categoryAspects.reduce((sum, a) => sum + a.sentimentScore * a.mentions, 0) / categoryMentions;

      categories.push({
        category,
        aspects: categoryAspects,
        overallScore: avgScore,
        importance: categoryMentions / totalMentions
      });
    }

    return categories.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Identify improvement opportunities
   */
  identifyImprovementOpportunities(
    aspects: ProductAspect[],
    overallSentiment: number
  ): ImprovementOpportunity[] {
    const opportunities: ImprovementOpportunity[] = [];

    for (const aspect of aspects) {
      // Only consider aspects with negative or neutral sentiment
      if (aspect.sentimentScore >= 0.3) continue;

      // Calculate potential impact
      // Higher mentions = higher potential impact
      const mentionWeight = aspect.mentions / Math.max(...aspects.map(a => a.mentions));
      const sentimentGap = 0.8 - aspect.sentimentScore; // Target sentiment of 0.8
      const potentialImpact = mentionWeight * sentimentGap;

      // Determine priority
      let priority: 'high' | 'medium' | 'low';
      if (potentialImpact > 0.5 && aspect.sentimentScore < -0.2) {
        priority = 'high';
      } else if (potentialImpact > 0.3) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Generate suggestions based on aspect
      const suggestions = this.generateSuggestions(aspect);

      opportunities.push({
        aspect: aspect.name,
        category: aspect.category,
        currentScore: aspect.sentimentScore,
        potentialImpact,
        priority,
        suggestions
      });
    }

    return opportunities.sort((a, b) => b.potentialImpact - a.potentialImpact);
  }

  /**
   * Generate improvement suggestions for an aspect
   */
  private generateSuggestions(aspect: ProductAspect): string[] {
    const suggestions: string[] = [];

    // Analyze negative examples
    const negativeExamples = aspect.examples.filter(e => e.sentiment < -0.2);

    if (aspect.category === 'product_quality') {
      suggestions.push('Review material quality and durability standards');
      suggestions.push('Implement additional quality control checks');
      if (negativeExamples.length > 0) {
        suggestions.push('Investigate specific quality issues mentioned in reviews');
      }
    } else if (aspect.category === 'price_value') {
      suggestions.push('Consider pricing strategy adjustments');
      suggestions.push('Enhance perceived value through bundling or features');
      suggestions.push('Communicate value proposition more clearly');
    } else if (aspect.category === 'shipping_delivery') {
      suggestions.push('Review shipping processes and partners');
      suggestions.push('Improve packaging to prevent damage');
      suggestions.push('Set clearer delivery time expectations');
    } else if (aspect.category === 'customer_service') {
      suggestions.push('Enhance customer service training');
      suggestions.push('Reduce response times');
      suggestions.push('Improve issue resolution processes');
    } else if (aspect.category === 'design_appearance') {
      suggestions.push('Gather design feedback from target audience');
      suggestions.push('Consider design refresh or variations');
      suggestions.push('Improve product photography and descriptions');
    } else if (aspect.category === 'performance') {
      suggestions.push('Conduct performance benchmarking');
      suggestions.push('Optimize product specifications');
      suggestions.push('Address performance issues in next iteration');
    } else if (aspect.category === 'ease_of_use') {
      suggestions.push('Improve user documentation and guides');
      suggestions.push('Simplify setup or usage process');
      suggestions.push('Provide tutorial videos or quick start guides');
    } else if (aspect.category === 'features') {
      suggestions.push('Prioritize most-requested feature additions');
      suggestions.push('Improve existing feature discoverability');
      suggestions.push('Conduct competitive feature analysis');
    } else if (aspect.category === 'size_fit') {
      suggestions.push('Provide detailed sizing information');
      suggestions.push('Offer size variety if applicable');
      suggestions.push('Include accurate dimension specifications');
    } else if (aspect.category === 'comfort') {
      suggestions.push('Review ergonomic design');
      suggestions.push('Test comfort with target user group');
      suggestions.push('Consider material or padding improvements');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Compare aspects across multiple products
   */
  compareAspects(
    productReviews: Map<string, ReviewDocument[]>
  ): AspectComparison[] {
    const comparisons: AspectComparison[] = [];
    const allAspects = new Set<string>();

    // Get all aspects from all products
    const productAspects = new Map<string, ProductAspect[]>();
    for (const [productId, reviews] of productReviews.entries()) {
      const aspects = this.calculateAspectScores(reviews);
      productAspects.set(productId, aspects);
      aspects.forEach(a => allAspects.add(a.name));
    }

    // Compare each aspect across products
    for (const aspectName of allAspects) {
      const productScores = new Map<string, number>();
      let maxScore = -Infinity;
      let leader = '';

      for (const [productId, aspects] of productAspects.entries()) {
        const aspect = aspects.find(a => a.name === aspectName);
        const score = aspect ? aspect.sentimentScore : 0;
        productScores.set(productId, score);

        if (score > maxScore) {
          maxScore = score;
          leader = productId;
        }
      }

      // Calculate gap
      const scores = Array.from(productScores.values());
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const gap = maxScore - avgScore;

      comparisons.push({
        aspect: aspectName,
        productScores,
        leader,
        gap
      });
    }

    return comparisons.sort((a, b) => b.gap - a.gap);
  }

  /**
   * Cluster reviews by aspect using vector embeddings (simulated)
   */
  async clusterByAspect(
    reviews: ReviewDocument[],
    aspect: string
  ): Promise<Map<string, ReviewDocument[]>> {
    const clusters = new Map<string, ReviewDocument[]>();
    clusters.set('positive', []);
    clusters.set('neutral', []);
    clusters.set('negative', []);

    const category = this.mapAspectToCategory(aspect);
    const terms = this.aspectCategories[category] || [];

    for (const review of reviews) {
      const processed = this.reviewProcessor.processReview(review);
      const sentences = processed.sentences.filter(sentence => {
        const lower = sentence.toLowerCase();
        return terms.some(term => lower.includes(term));
      });

      if (sentences.length === 0) continue;

      const sentiment = this.sentimentAnalyzer.analyzeSentiment(sentences.join(' '));

      if (sentiment.overall > 0.2) {
        clusters.get('positive')!.push(review);
      } else if (sentiment.overall < -0.2) {
        clusters.get('negative')!.push(review);
      } else {
        clusters.get('neutral')!.push(review);
      }
    }

    return clusters;
  }

  /**
   * Extract emerging aspects (aspects gaining attention)
   */
  extractEmergingAspects(
    oldReviews: ReviewDocument[],
    newReviews: ReviewDocument[]
  ): {
    aspect: string;
    oldMentions: number;
    newMentions: number;
    growthRate: number;
  }[] {
    const oldAspects = this.calculateAspectScores(oldReviews);
    const newAspects = this.calculateAspectScores(newReviews);

    const emerging: {
      aspect: string;
      oldMentions: number;
      newMentions: number;
      growthRate: number;
    }[] = [];

    for (const newAspect of newAspects) {
      const oldAspect = oldAspects.find(a => a.name === newAspect.name);
      const oldMentions = oldAspect ? oldAspect.mentions : 0;
      const growthRate = oldMentions > 0
        ? (newAspect.mentions - oldMentions) / oldMentions
        : newAspect.mentions;

      if (growthRate > 0.2) { // At least 20% growth
        emerging.push({
          aspect: newAspect.name,
          oldMentions,
          newMentions: newAspect.mentions,
          growthRate
        });
      }
    }

    return emerging.sort((a, b) => b.growthRate - a.growthRate);
  }
}
