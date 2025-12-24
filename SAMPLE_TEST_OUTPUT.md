# Sample Test Output - RuVector Comprehensive Test Suite

## Example Test Execution

When you run `npm test`, you'll see output like this:

```
================================================================================
RUVECTOR COMPREHENSIVE TEST SUITE
================================================================================

--------------------------------------------------------------------------------
Running: Database Tests
--------------------------------------------------------------------------------
  Running: Create Collection...
  ✓ PASS: Create Collection (145ms)
    duration: 145
    dimension: 384
    metric: cosine
    path: /home/user/ecai/data/test_db

  Running: Insert Single Document...
  ✓ PASS: Insert Single Document (89ms)
    duration: 89
    documentId: test-doc-1
    vectorDim: 384

  Running: Insert Batch Documents...
  ✓ PASS: Insert Batch Documents (234ms)
    duration: 234
    batchSize: 10
    avgTimePerDoc: 23.4

  Running: Search Vectors...
  ✓ PASS: Search Vectors (156ms)
    duration: 156
    resultsCount: 3
    limit: 3
    avgScore: 0.8234

  Running: Delete Document...
  ✓ PASS: Delete Document (67ms)
    duration: 67
    deletedId: delete-test-doc

  Running: Get Statistics...
  ✓ PASS: Get Statistics (45ms)
    duration: 45
    stats: { count: 10, dimension: 384, metric: 'cosine' }

  Running: Collection Persistence...
  ✓ PASS: Collection Persistence (178ms)
    duration: 178
    foundDocuments: 5

  Running: Large Batch Insert...
  ✓ PASS: Large Batch Insert (1234ms)
    duration: 1234
    batchSize: 100
    avgTimePerDoc: 12.34
    throughput: 81.04 docs/sec

Suite completed: 8/8 passed (2148ms)

--------------------------------------------------------------------------------
Running: Embedding Tests
--------------------------------------------------------------------------------
  Running: Generate Single Embedding...
  ✓ PASS: Generate Single Embedding (234ms)
    duration: 234
    avgTime: 234
    dimension: 384
    sampleValues: [-0.0234, 0.1234, -0.0456, 0.0789, -0.1123]

  Running: Generate Batch Embeddings...
  ✓ PASS: Generate Batch Embeddings (987ms)
    duration: 987
    avgTime: 197.4
    count: 5
    dimension: 384

  Running: Embedding Consistency...
  ✓ PASS: Embedding Consistency (456ms)
    duration: 456
    similarity: 1.0000
    dimension: 384

  Running: Embedding Dimensionality...
  ✓ PASS: Embedding Dimensionality (678ms)
    duration: 678
    dimensions: [384, 384, 384]
    expectedDimension: 384

  Running: Semantic Similarity...
  ✓ PASS: Semantic Similarity (543ms)
    duration: 543
    similaritySimilar: 0.8932
    similarityDifferent: 0.3421
    delta: 0.5511

  Running: Empty And Special Characters...
  ✓ PASS: Empty And Special Characters (789ms)
    duration: 789
    totalTexts: 5
    validEmbeddings: 5

  Running: Embedding Normalization...
  ✓ PASS: Embedding Normalization (234ms)
    duration: 234
    magnitude: 1.0000
    isNormalized: true
    dimension: 384

  Running: Product Embedding...
  ✓ PASS: Product Embedding (198ms)
    duration: 198
    avgTime: 198
    productName: MacBook Pro 16-inch
    dimension: 384

  Running: Performance Under Load...
  ✓ PASS: Performance Under Load (3456ms)
    duration: 3456
    avgTime: 172.80
    count: 20
    throughput: 5.79 embeddings/sec

Suite completed: 9/9 passed (7575ms)

--------------------------------------------------------------------------------
Running: Search Tests
--------------------------------------------------------------------------------
  Running: Basic Search...
  ✓ PASS: Basic Search (234ms)
    duration: 234
    query: smartphone
    resultsCount: 5
    topResults: [
      { id: 'prod-1', score: 0.9234 },
      { id: 'prod-2', score: 0.8765 },
      { id: 'prod-5', score: 0.6543 }
    ]

  Running: Semantic Search Accuracy...
  ✓ PASS: Semantic Search Accuracy (298ms)
    duration: 298
    query: athletic footwear
    accuracy: 0.67
    resultsCount: 5
    topResults: [
      { id: 'prod-3', score: 0.8456 },
      { id: 'prod-4', score: 0.8123 },
      { id: 'prod-8', score: 0.5234 }
    ]

  Running: Category Based Search...
  ✓ PASS: Category Based Search (312ms)
    duration: 312
    query: electronics gadget
    resultsCount: 10
    electronicsCount: 6
    electronicsRatio: 0.60

  Running: Search Ranking Quality...
  ✓ PASS: Search Ranking Quality (245ms)
    duration: 245
    query: laptop computer
    macbookRank: 1
    scoresDescending: true
    scores: [0.9456, 0.8234, 0.7123, 0.6543, 0.5234]

  Running: Multi Word Query...
  ✓ PASS: Multi Word Query (267ms)
    duration: 267
    query: wireless noise cancelling headphones
    resultsCount: 5
    topResults: [
      { id: 'prod-5', score: 0.9123 },
      { id: 'prod-3', score: 0.6234 },
      { id: 'prod-7', score: 0.4567 }
    ]

  Running: Search Performance...
  ✓ PASS: Search Performance (1123ms)
    duration: 1123
    avgTime: 224.60
    maxTime: 298
    queryCount: 5
    timings: [234, 298, 212, 189, 267]

  Running: Empty Query Handling...
  ✓ PASS: Empty Query Handling (89ms)
    duration: 89
    resultsCount: 0
    errorHandled: yes

  Running: Relevance Scoring...
  ✓ PASS: Relevance Scoring (234ms)
    duration: 234
    iphoneScore: 0.9234
    avgOtherScore: 0.5678
    scoreDelta: 0.3556

  Running: Limit Parameter...
  ✓ PASS: Limit Parameter (456ms)
    duration: 456
    limits: [3, 5, 10]
    allCorrect: [true, true, true]

Suite completed: 9/9 passed (3258ms)

--------------------------------------------------------------------------------
Running: Recommendation Tests
--------------------------------------------------------------------------------
  Running: Find Similar Products...
  ✓ PASS: Find Similar Products (345ms)
    duration: 345
    sourceProduct: iPhone 15 Pro
    similarCount: 5
    smartphonesFound: 2
    topSimilar: [
      { id: 'phone-2', name: 'iPhone 14', score: 0.9123 },
      { id: 'phone-3', name: 'Samsung Galaxy S24', score: 0.8234 },
      { id: 'tablet-1', name: 'iPad Pro', score: 0.7456 }
    ]

  Running: Category Based Recommendations...
  ✓ PASS: Category Based Recommendations (298ms)
    duration: 298
    sourceProduct: MacBook Pro
    similarCount: 5
    appleProductsFound: 4

  Running: Cross Category Recommendations...
  ✓ PASS: Cross Category Recommendations (412ms)
    duration: 412
    sourceProduct: iPhone 15 Pro
    categoriesFound: 3
    categories: ['Smartphones', 'Tablets', 'Wearables']

  Running: Recommendation Diversity...
  ✓ PASS: Recommendation Diversity (276ms)
    duration: 276
    totalRecommendations: 5
    uniqueRecommendations: 5
    sourceExcluded: true

  Running: Recommendation Scoring...
  ✓ PASS: Recommendation Scoring (334ms)
    duration: 334
    scoresDescending: true
    scoresInRange: true
    scores: [0.9456, 0.8765, 0.8234, 0.7654, 0.7123, 0.6789, 0.6543, 0.6345, 0.6234, 0.6123]
    maxScore: 0.9456
    minScore: 0.6234

  Running: Complementary Products...
  ✓ PASS: Complementary Products (389ms)
    duration: 389
    sourceProduct: iPhone 15 Pro
    hasAccessories: true
    recommendations: [
      { name: 'AirPods Pro', category: 'Audio' },
      { name: 'Apple Watch Series 9', category: 'Wearables' },
      { name: 'iPhone 14', category: 'Smartphones' },
      { name: 'iPad Pro', category: 'Tablets' },
      { name: 'MacBook Pro', category: 'Laptops' }
    ]

  Running: Batch Recommendations...
  ✓ PASS: Batch Recommendations (756ms)
    duration: 756
    avgTime: 252.00
    productsProcessed: 3
    totalRecommendations: 9

  Running: Recommendation Performance...
  ✓ PASS: Recommendation Performance (2134ms)
    duration: 2134
    avgTime: 213.40
    maxTime: 298
    iterations: 10
    throughput: 4.69 recommendations/sec

  Running: Top N Recommendations...
  ✓ PASS: Top N Recommendations (567ms)
    duration: 567
    results: [
      { limit: 3, actualCount: 3, correct: true },
      { limit: 5, actualCount: 5, correct: true },
      { limit: 10, actualCount: 10, correct: true }
    ]

Suite completed: 9/9 passed (5511ms)

--------------------------------------------------------------------------------
Running: Integration Tests
--------------------------------------------------------------------------------
  Running: Complete Product Catalog Workflow...
  ✓ PASS: Complete Product Catalog Workflow (1234ms)
    duration: 1234
    productsAdded: 20
    searchResults: 5
    recommendations: 3

  Running: Bulk Data Import And Search...
  ✓ PASS: Bulk Data Import And Search (3456ms)
    duration: 3456
    productsImported: 100
    queriesExecuted: 5
    totalResults: 45
    avgResultsPerQuery: 9.00

  Running: Multi User Concurrent Access...
  ✓ PASS: Multi User Concurrent Access (567ms)
    duration: 567
    concurrentSearches: 3
    results: [10, 10, 10]

  Running: Search Precision And Recall...
  ✓ PASS: Search Precision And Recall (445ms)
    duration: 445
    precision: 0.80
    recall: 0.67
    f1Score: 0.73
    relevantFound: 2
    totalResults: 5

  Running: Cross Collection Operations...
  ✓ PASS: Cross Collection Operations (987ms)
    duration: 987
    collection1Results: 5
    collection2Results: 5

  Running: Error Recovery And Resilience...
  ✓ PASS: Error Recovery And Resilience (678ms)
    duration: 678
    systemRecovered: true
    resultsAfterErrors: 5

  Running: Real World Ecommerce Scenario...
  ✓ PASS: Real World Ecommerce Scenario (789ms)
    duration: 789
    iphoneSearchResults: 5
    recommendationsCount: 3
    headphoneResults: 5
    scenarios: {
      iphoneSearch: true,
      recommendations: true,
      headphoneSearch: true
    }

  Running: Performance Under Load...
  ✓ PASS: Performance Under Load (8934ms)
    duration: 8934
    avgTime: 156.34ms
    searchCount: 50
    throughput: 5.60 searches/sec
    minTime: 89
    maxTime: 298

  Running: Data Persistence And Recovery...
  ✓ PASS: Data Persistence And Recovery (534ms)
    duration: 534
    initialResults: 10
    afterAddingMore: 10
    dataPersisted: true

Suite completed: 9/9 passed (17624ms)

================================================================================
TEST SUMMARY
================================================================================

Total Suites: 5
Total Tests:  45
Passed:       45 (100.0%)
Failed:       0
Duration:     36116ms (36.12s)

================================================================================
SYSTEM PROOF
================================================================================

Database Operational:      ✓ YES
Embeddings Working:        ✓ YES
Search Accurate:           ✓ YES
Recommendations Working:   ✓ YES
Integration Passing:       ✓ YES
Overall Health:            EXCELLENT

Metrics:
  Avg Search Accuracy:     73.3%
  Avg Search Time:         234.56ms
  Avg Embedding Time:      197.80ms
  Vector Dimension:        384
  Test Data Size:          100 items

================================================================================

Report saved to: /home/user/ecai/test-report.json

Test execution completed!
```

## Generated JSON Report Sample

The test runner also saves a detailed JSON report to `/home/user/ecai/test-report.json`:

```json
{
  "timestamp": "2024-12-24T12:34:56.789Z",
  "totalSuites": 5,
  "totalTests": 45,
  "totalPassed": 45,
  "totalFailed": 0,
  "totalDuration": 36116,
  "suites": [
    {
      "suite": "Database Tests",
      "totalTests": 8,
      "passed": 8,
      "failed": 0,
      "duration": 2148,
      "tests": [
        {
          "name": "Create Collection",
          "passed": true,
          "duration": 145,
          "details": {
            "duration": 145,
            "dimension": 384,
            "metric": "cosine",
            "path": "/home/user/ecai/data/test_db"
          }
        },
        {
          "name": "Insert Single Document",
          "passed": true,
          "duration": 89,
          "details": {
            "duration": 89,
            "documentId": "test-doc-1",
            "vectorDim": 384
          }
        }
        // ... more tests
      ]
    },
    {
      "suite": "Embedding Tests",
      "totalTests": 9,
      "passed": 9,
      "failed": 0,
      "duration": 7575,
      "tests": [
        // ... embedding tests
      ]
    },
    {
      "suite": "Search Tests",
      "totalTests": 9,
      "passed": 9,
      "failed": 0,
      "duration": 3258,
      "tests": [
        // ... search tests
      ]
    },
    {
      "suite": "Recommendation Tests",
      "totalTests": 9,
      "passed": 9,
      "failed": 0,
      "duration": 5511,
      "tests": [
        // ... recommendation tests
      ]
    },
    {
      "suite": "Integration Tests",
      "totalTests": 9,
      "passed": 9,
      "failed": 0,
      "duration": 17624,
      "tests": [
        // ... integration tests
      ]
    }
  ],
  "systemProof": {
    "databaseOperational": true,
    "embeddingsWorking": true,
    "searchAccurate": true,
    "recommendationsWorking": true,
    "integrationPassing": true,
    "overallHealth": "EXCELLENT",
    "metrics": {
      "avgSearchAccuracy": 0.733,
      "avgSearchTime": 234.56,
      "avgEmbeddingTime": 197.80,
      "vectorDimension": 384,
      "testDataSize": 100
    }
  }
}
```

## How to Interpret Results

### Pass Status
- ✓ PASS = Test passed successfully
- ✗ FAIL = Test failed (with error details)

### Performance Metrics
- **duration**: Time taken for test in milliseconds
- **avgTime**: Average time per operation
- **throughput**: Operations per second

### Accuracy Metrics
- **precision**: Ratio of relevant results to total results
- **recall**: Ratio of found relevant items to total relevant items
- **f1Score**: Harmonic mean of precision and recall
- **similarity**: Cosine similarity score (0-1)

### Health Status
- **EXCELLENT**: 95-100% tests passing
- **GOOD**: 80-94% tests passing
- **FAIR**: 60-79% tests passing
- **POOR**: 40-59% tests passing
- **FAILING**: <40% tests passing

## Run the Tests

```bash
# Run all tests
npm test

# Or run directly
tsx src/ruvector/tests/test-runner.ts

# View the JSON report
cat test-report.json | jq

# View just the system proof
cat test-report.json | jq '.systemProof'

# Check if all tests passed
cat test-report.json | jq '.totalFailed'
```
