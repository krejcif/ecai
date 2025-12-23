/**
 * Review Processor - Parse, clean, and process review text
 */

import { ReviewDocument } from '../../database/collections';

export interface ProcessedReview {
  original: string;
  cleaned: string;
  tokens: string[];
  sentences: string[];
  keyPhrases: string[];
  language: string;
  wordCount: number;
}

export interface AuthenticitySignals {
  isAuthentic: boolean;
  confidence: number;
  signals: {
    lengthScore: number; // Reviews too short or too long may be suspicious
    diversityScore: number; // Vocabulary diversity
    specificityScore: number; // Presence of specific details
    balanceScore: number; // Mix of positive and negative aspects
  };
  warnings: string[];
}

export interface ReviewMetrics {
  averageLength: number;
  vocabularySize: number;
  readabilityScore: number;
  emotionalIntensity: number;
}

export class ReviewProcessor {
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ]);

  private readonly spamPatterns = [
    /http[s]?:\/\//i,
    /www\./i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\d{10,}/,
    /(.)\1{4,}/
  ];

  /**
   * Clean and normalize review text
   */
  cleanText(text: string): string {
    // Remove extra whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Remove special characters but keep punctuation
    cleaned = cleaned.replace(/[^\w\s.,!?'-]/g, '');

    // Normalize case (keep original case for now, will lowercase for analysis)
    return cleaned;
  }

  /**
   * Tokenize text into words
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Extract sentences from text
   */
  extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extract key phrases from review
   */
  extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
    const sentences = this.extractSentences(text);
    const phrases: { phrase: string; score: number }[] = [];

    for (const sentence of sentences) {
      const tokens = this.tokenize(sentence);
      const contentWords = tokens.filter(t => !this.stopWords.has(t) && t.length > 3);

      // Score sentences by content word density
      if (contentWords.length >= 2) {
        const score = contentWords.length / tokens.length;
        phrases.push({
          phrase: sentence,
          score
        });
      }

      // Extract noun phrases (simple approach: consecutive content words)
      for (let i = 0; i < tokens.length - 1; i++) {
        if (!this.stopWords.has(tokens[i]) && !this.stopWords.has(tokens[i + 1])) {
          const phrase = tokens.slice(i, Math.min(i + 3, tokens.length))
            .filter(t => !this.stopWords.has(t))
            .join(' ');
          if (phrase.length > 5) {
            phrases.push({
              phrase,
              score: 0.5
            });
          }
        }
      }
    }

    // Return top phrases
    return phrases
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPhrases)
      .map(p => p.phrase);
  }

  /**
   * Detect language (simple heuristic-based detection)
   */
  detectLanguage(text: string): string {
    // Common English words
    const englishWords = ['the', 'is', 'and', 'to', 'a', 'of', 'in', 'it', 'you', 'that'];
    // Common Spanish words
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no'];
    // Common French words
    const frenchWords = ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je'];

    const tokens = this.tokenize(text);
    const englishScore = tokens.filter(t => englishWords.includes(t)).length;
    const spanishScore = tokens.filter(t => spanishWords.includes(t)).length;
    const frenchScore = tokens.filter(t => frenchWords.includes(t)).length;

    if (englishScore >= spanishScore && englishScore >= frenchScore) {
      return 'en';
    } else if (spanishScore >= frenchScore) {
      return 'es';
    } else if (frenchScore > 0) {
      return 'fr';
    }

    return 'unknown';
  }

  /**
   * Process a single review
   */
  processReview(review: ReviewDocument): ProcessedReview {
    const cleaned = this.cleanText(review.text);
    const tokens = this.tokenize(cleaned);
    const sentences = this.extractSentences(cleaned);
    const keyPhrases = this.extractKeyPhrases(cleaned);
    const language = this.detectLanguage(cleaned);

    return {
      original: review.text,
      cleaned,
      tokens,
      sentences,
      keyPhrases,
      language,
      wordCount: tokens.length
    };
  }

  /**
   * Identify authenticity signals in a review
   */
  analyzeAuthenticity(review: ReviewDocument): AuthenticitySignals {
    const processed = this.processReview(review);
    const warnings: string[] = [];

    // Length score (optimal range: 20-200 words)
    let lengthScore = 1.0;
    if (processed.wordCount < 10) {
      lengthScore = 0.3;
      warnings.push('Review is very short');
    } else if (processed.wordCount < 20) {
      lengthScore = 0.6;
    } else if (processed.wordCount > 300) {
      lengthScore = 0.7;
      warnings.push('Review is unusually long');
    }

    // Diversity score (unique words / total words)
    const uniqueWords = new Set(processed.tokens);
    const diversityScore = Math.min(1.0, uniqueWords.size / Math.max(processed.wordCount, 1));
    if (diversityScore < 0.3) {
      warnings.push('Low vocabulary diversity');
    }

    // Specificity score (presence of specific details)
    const specificWords = processed.tokens.filter(t =>
      !this.stopWords.has(t) && t.length > 5
    );
    const specificityScore = Math.min(1.0, specificWords.length / Math.max(processed.wordCount * 0.3, 1));
    if (specificityScore < 0.2) {
      warnings.push('Lacks specific details');
    }

    // Balance score (extreme ratings should have mixed sentiments)
    const positiveWords = ['good', 'great', 'excellent', 'love', 'perfect'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'worst'];
    const posCount = processed.tokens.filter(t => positiveWords.includes(t)).length;
    const negCount = processed.tokens.filter(t => negativeWords.includes(t)).length;

    let balanceScore = 1.0;
    if (review.rating === 5 && negCount === 0 && posCount > 5) {
      balanceScore = 0.6;
      warnings.push('Only positive language in 5-star review');
    } else if (review.rating === 1 && posCount === 0 && negCount > 5) {
      balanceScore = 0.6;
      warnings.push('Only negative language in 1-star review');
    }

    // Check for spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(review.text)) {
        warnings.push('Contains suspicious patterns');
        lengthScore *= 0.5;
        break;
      }
    }

    // Calculate overall authenticity
    const signals = {
      lengthScore,
      diversityScore,
      specificityScore,
      balanceScore
    };

    const confidence = (
      lengthScore * 0.3 +
      diversityScore * 0.2 +
      specificityScore * 0.3 +
      balanceScore * 0.2
    );

    return {
      isAuthentic: confidence > 0.5,
      confidence,
      signals,
      warnings
    };
  }

  /**
   * Batch process multiple reviews
   */
  batchProcess(reviews: ReviewDocument[]): ProcessedReview[] {
    return reviews.map(review => this.processReview(review));
  }

  /**
   * Calculate review metrics across multiple reviews
   */
  calculateMetrics(reviews: ReviewDocument[]): ReviewMetrics {
    const processed = this.batchProcess(reviews);

    // Average length
    const averageLength = processed.reduce((sum, p) => sum + p.wordCount, 0) / processed.length;

    // Vocabulary size
    const allWords = new Set<string>();
    processed.forEach(p => p.tokens.forEach(t => allWords.add(t)));
    const vocabularySize = allWords.size;

    // Readability score (based on average sentence length)
    const totalSentences = processed.reduce((sum, p) => sum + p.sentences.length, 0);
    const avgSentenceLength = averageLength / (totalSentences / processed.length);
    const readabilityScore = Math.max(0, Math.min(1, 1 - (avgSentenceLength - 15) / 30));

    // Emotional intensity (based on exclamation marks and caps)
    const emotionalMarkers = reviews.reduce((sum, r) => {
      const exclamations = (r.text.match(/!/g) || []).length;
      const caps = (r.text.match(/[A-Z]{2,}/g) || []).length;
      return sum + exclamations + caps;
    }, 0);
    const emotionalIntensity = Math.min(1, emotionalMarkers / (reviews.length * 2));

    return {
      averageLength,
      vocabularySize,
      readabilityScore,
      emotionalIntensity
    };
  }

  /**
   * Filter out low-quality or spam reviews
   */
  filterQualityReviews(reviews: ReviewDocument[], minConfidence: number = 0.5): ReviewDocument[] {
    return reviews.filter(review => {
      const authenticity = this.analyzeAuthenticity(review);
      return authenticity.isAuthentic && authenticity.confidence >= minConfidence;
    });
  }

  /**
   * Extract named entities (simple approach)
   */
  extractEntities(text: string): {
    brands: string[];
    features: string[];
    locations: string[];
  } {
    const brands: string[] = [];
    const features: string[] = [];
    const locations: string[] = [];

    // Common brand patterns (capitalized words)
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]+/.test(w));

    // Simple heuristic: consecutive capitalized words might be brand names
    for (let i = 0; i < capitalizedWords.length; i++) {
      const word = capitalizedWords[i];
      if (word.length > 2) {
        brands.push(word);
      }
    }

    // Extract quoted phrases as potential features
    const quotedPhrases = text.match(/"([^"]+)"/g);
    if (quotedPhrases) {
      features.push(...quotedPhrases.map(q => q.replace(/"/g, '')));
    }

    return {
      brands: [...new Set(brands)].slice(0, 5),
      features: [...new Set(features)].slice(0, 5),
      locations: locations.slice(0, 5)
    };
  }

  /**
   * Compare reviews to find duplicates or similar content
   */
  findSimilarReviews(
    review: ReviewDocument,
    allReviews: ReviewDocument[],
    threshold: number = 0.7
  ): ReviewDocument[] {
    const processed = this.processReview(review);
    const similar: { review: ReviewDocument; similarity: number }[] = [];

    for (const other of allReviews) {
      if (other.id === review.id) continue;

      const otherProcessed = this.processReview(other);

      // Calculate Jaccard similarity
      const set1 = new Set(processed.tokens);
      const set2 = new Set(otherProcessed.tokens);
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      const similarity = intersection.size / union.size;

      if (similarity >= threshold) {
        similar.push({ review: other, similarity });
      }
    }

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .map(s => s.review);
  }
}
