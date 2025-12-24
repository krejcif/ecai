# Product Categorization System

AI-powered product categorization system using vector similarity and ruvector.

## Overview

The Product Categorization System automatically assigns categories to products based on semantic similarity. It uses vector embeddings to understand product descriptions and matches them to predefined categories using the ruvector CLI for efficient vector search.

## Features

- **Automatic Categorization**: Assign categories to products using AI-powered semantic matching
- **Category Suggestions**: Get multiple category suggestions with confidence scores
- **Miscategorization Detection**: Find products that might be in the wrong category
- **Custom Categories**: Add and manage custom product categories
- **Batch Processing**: Categorize multiple products efficiently
- **Vector Index**: Fast category matching using ruvector vector search

## Components

### ProductCategorizer

Main class for product categorization operations.

**Key Methods:**

- `categorizeProduct(product)`: Categorize a single product
- `suggestCategories(product, limit)`: Get top N category suggestions
- `findMiscategorized(products)`: Find potentially miscategorized products
- `getCategoryEmbeddings()`: Get vector representations of all categories
- `categorizeProducts(products)`: Batch categorize multiple products

### CategoryIndex

Manages the vector index for category matching.

**Key Methods:**

- `buildCategoryIndex(categories)`: Build vector index from categories
- `matchCategory(productVector)`: Find best matching category for a vector
- `matchCategories(productVector, limit)`: Get top N matching categories
- `addCategory(category)`: Add a new category to the index
- `removeCategory(categoryId)`: Remove a category from the index

## Usage

### Basic Example

```typescript
import { ProductCategorizer, Product } from './ruvector';

// Create categorizer with default categories
const categorizer = await ProductCategorizer.createWithDefaultCategories();

// Categorize a product
const product: Product = {
  id: 'p1',
  name: 'iPhone 14 Pro',
  description: 'Latest Apple smartphone with advanced camera system'
};

const result = await categorizer.categorizeProduct(product);
console.log(`Category: ${result.suggestedCategory}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Score: ${(result.score * 100).toFixed(1)}%`);
```

### Get Category Suggestions

```typescript
// Get top 5 category suggestions
const suggestions = await categorizer.suggestCategories(product, 5);

suggestions.forEach((match, i) => {
  console.log(`${i + 1}. ${match.category.name}`);
  console.log(`   Score: ${(match.score * 100).toFixed(1)}%`);
  console.log(`   Confidence: ${match.confidence}`);
});
```

### Find Miscategorized Products

```typescript
const products: Product[] = [
  {
    id: 'p1',
    name: 'Wireless Gaming Mouse',
    description: 'High-precision gaming mouse',
    category: 'Toys & Games' // Wrong category
  },
  // ... more products
];

const miscategorized = await categorizer.findMiscategorized(products);

miscategorized.forEach(item => {
  console.log(`Product: ${item.product.name}`);
  console.log(`Current: ${item.currentCategory}`);
  console.log(`Suggested: ${item.suggestedCategory}`);
  console.log(`Reason: ${item.reason}`);
});
```

### Custom Categories

```typescript
import { Category } from './ruvector';

// Create custom category
const customCategory: Category = {
  id: 'pet-supplies',
  name: 'Pet Supplies',
  description: 'Products for pets including food, toys, and accessories',
  keywords: ['pet', 'dog', 'cat', 'animal', 'pet food', 'toy', 'leash']
};

// Add to categorizer
await categorizer.addCategory(customCategory);

// Use custom category
const petProduct: Product = {
  id: 'p2',
  name: 'Dog Chew Toy',
  description: 'Durable rubber toy for dogs'
};

const result = await categorizer.categorizeProduct(petProduct);
// Should suggest 'Pet Supplies'
```

### Batch Categorization

```typescript
const products: Product[] = [/* array of products */];

const results = await categorizer.categorizeProducts(products);

results.forEach(result => {
  console.log(`${result.productId}: ${result.suggestedCategory} (${result.confidence})`);
});
```

### Get Category Embeddings

```typescript
// Get vector representations of all categories
const embeddings = await categorizer.getCategoryEmbeddings();

embeddings.forEach(emb => {
  console.log(`Category: ${emb.categoryName}`);
  console.log(`Vector Dimension: ${emb.vector.length}`);
  console.log(`Products: ${emb.productCount || 0}`);
});
```

## Default Categories

The system comes with 10 predefined e-commerce categories:

1. **Electronics** - Electronic devices, gadgets, computers, smartphones
2. **Clothing & Apparel** - Clothing, fashion, shoes, accessories
3. **Home & Garden** - Furniture, decor, garden supplies
4. **Food & Beverages** - Food products, groceries, drinks
5. **Beauty & Personal Care** - Cosmetics, skincare, personal hygiene
6. **Sports & Outdoors** - Sports equipment, outdoor gear, fitness
7. **Toys & Games** - Toys, games, puzzles, entertainment
8. **Books & Media** - Books, magazines, movies, music
9. **Automotive** - Car parts, accessories, tools
10. **Office & School Supplies** - Office supplies, stationery

## Configuration

```typescript
import { ProductCategorizer, CategoryIndex, EmbeddingService } from './ruvector';

// Custom configuration
const categorizer = new ProductCategorizer({
  embeddingService: new EmbeddingService({
    model: 'default',
    maxRetries: 3
  }),
  categoryIndex: CategoryIndex.create({
    dataPath: '/custom/path/categories',
    similarityThreshold: 0.7
  }),
  confidenceThreshold: 0.7,
  miscategorizedThreshold: 0.3
});

// Initialize with custom categories
const categories: Category[] = [/* your categories */];
await categorizer.initialize(categories);
```

## Confidence Levels

The system provides three confidence levels:

- **high** (e 0.8): Strong match, very likely correct
- **medium** (0.6 - 0.8): Good match, likely correct
- **low** (< 0.6): Weak match, may need review

## How It Works

1. **Embedding Generation**: Product names and descriptions are converted to vector embeddings
2. **Category Indexing**: Categories are also embedded and stored in a vector index using ruvector
3. **Similarity Search**: Product vectors are compared to category vectors using cosine similarity
4. **Matching**: The category with the highest similarity score is suggested
5. **Confidence Scoring**: Scores are classified as high, medium, or low confidence

## Vector Search with Ruvector

The system uses `npx ruvector search` commands to find similar category vectors:

```bash
# Search for similar categories
npx ruvector search "/path/to/category_index" --query query.json --limit 5
```

Results are parsed and converted to category matches with confidence scores.

## Running the Demo

```bash
# Run the categorization demo
npx tsx src/ruvector/demo.ts
```

The demo showcases:
- Individual product categorization
- Category suggestions
- Miscategorization detection
- Category embeddings
- Batch processing
- Custom categories

## API Reference

### Types

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  category?: string;
  price?: number;
  metadata?: Record<string, any>;
}

interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  parentCategory?: string;
  metadata?: Record<string, any>;
}

interface CategorizationResult {
  productId: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  alternatives: Array<{
    category: string;
    score: number;
  }>;
}

interface CategoryMatch {
  categoryId: string;
  category: Category;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}
```

## Performance

- **Embedding Generation**: ~100ms per product
- **Category Matching**: ~50ms per product
- **Batch Processing**: 10 products in parallel
- **Index Building**: ~1s for 10 categories

## Best Practices

1. **Use Default Categories**: Start with the default categories and customize as needed
2. **Batch Processing**: Use `categorizeProducts()` for multiple products
3. **Review Low Confidence**: Manually review products with low confidence scores
4. **Regular Audits**: Periodically run `findMiscategorized()` to maintain accuracy
5. **Category Hierarchy**: Use `parentCategory` field for hierarchical categorization
6. **Keywords Matter**: Provide comprehensive keywords for better matching

## Limitations

- Requires ruvector CLI to be installed
- Category matching depends on embedding quality
- Similarity threshold may need tuning for specific domains
- Custom categories should be well-defined with good keywords

## Future Enhancements

- Hierarchical category support
- Multi-language categorization
- Category recommendation based on product history
- Automatic category creation from product clusters
- Integration with existing product catalogs
