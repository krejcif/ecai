/**
 * Collection schemas for ruvector database
 */

export interface BaseDocument {
  id: string;
  vector?: number[];
}

export interface ProductDocument extends BaseDocument {
  name: string;
  description: string;
  category: string;
  price: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface ReviewDocument extends BaseDocument {
  productId: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  rating: number;
  date?: string;
  metadata?: Record<string, any>;
}

export interface SupplierDocument extends BaseDocument {
  name: string;
  location: string;
  riskScore: number;
  description?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface TrendDocument extends BaseDocument {
  keyword: string;
  volume: number;
  growth: number;
  timestamp: string;
  category?: string;
  metadata?: Record<string, any>;
}

export type CollectionDocument =
  | ProductDocument
  | ReviewDocument
  | SupplierDocument
  | TrendDocument;

export enum CollectionName {
  PRODUCTS = 'products',
  REVIEWS = 'reviews',
  SUPPLIERS = 'suppliers',
  TRENDS = 'trends'
}

export interface CollectionConfig {
  name: CollectionName;
  dimension: number;
  metric?: 'cosine' | 'euclidean' | 'dot';
}

export const COLLECTION_CONFIGS: Record<CollectionName, CollectionConfig> = {
  [CollectionName.PRODUCTS]: {
    name: CollectionName.PRODUCTS,
    dimension: 384, // Default embedding dimension
    metric: 'cosine'
  },
  [CollectionName.REVIEWS]: {
    name: CollectionName.REVIEWS,
    dimension: 384,
    metric: 'cosine'
  },
  [CollectionName.SUPPLIERS]: {
    name: CollectionName.SUPPLIERS,
    dimension: 384,
    metric: 'cosine'
  },
  [CollectionName.TRENDS]: {
    name: CollectionName.TRENDS,
    dimension: 384,
    metric: 'cosine'
  }
};
