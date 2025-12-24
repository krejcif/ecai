# RuVector Test Suite - Quick Start Guide

## Installation & Setup

No additional installation needed! The test suite uses the existing ruvector CLI.

```bash
# Ensure you're in the project directory
cd /home/user/ecai

# Install dependencies (if not already installed)
npm install
```

## Running Tests

### Option 1: NPM Script (Recommended)
```bash
npm test
```

### Option 2: Direct Execution
```bash
tsx src/ruvector/tests/test-runner.ts
```

### Option 3: Run Individual Test Suite
```bash
# Database tests only
tsx -e "import {DatabaseTest} from './src/ruvector/tests/database-test'; const t = new DatabaseTest(); t.testCreateCollection().then(r => console.log(r))"

# Embedding tests
tsx -e "import {EmbeddingTest} from './src/ruvector/tests/embedding-test'; const t = new EmbeddingTest(); t.testGenerateSingleEmbedding().then(r => console.log(r))"

# Search tests
tsx -e "import {SearchTest} from './src/ruvector/tests/search-test'; const t = new SearchTest(); t.testBasicSearch().then(r => console.log(r))"
```

## Viewing Results

### Console Output
Tests output to console in real-time with detailed progress and results.

### JSON Report
A detailed JSON report is saved to `test-report.json`:

```bash
# View full report
cat test-report.json | jq

# View just system proof
cat test-report.json | jq '.systemProof'

# View summary
cat test-report.json | jq '{tests: .totalTests, passed: .totalPassed, failed: .totalFailed, health: .systemProof.overallHealth}'

# View specific suite results
cat test-report.json | jq '.suites[] | select(.suite | contains("Database"))'
```

## Understanding Test Output

### Console Format
```
Running: Test Name...
✓ PASS: Test Name (123ms)
  metric1: value1
  metric2: value2
```

### Status Indicators
- ✓ PASS - Test passed successfully
- ✗ FAIL - Test failed (error details shown)

### Metrics Reported
- **duration**: Test execution time (ms)
- **avgTime**: Average time per operation
- **throughput**: Operations per second
- **accuracy**: Search accuracy (0-1)
- **precision**: Precision metric (0-1)
- **recall**: Recall metric (0-1)
- **similarity**: Cosine similarity (0-1)

## Test Suites Overview

### 1. Database Tests (8 tests)
Tests core database operations using ruvector CLI.

**What it tests:**
- Collection creation
- Single/batch document insertion
- Vector search
- Document deletion
- Statistics retrieval
- Data persistence

**Run time:** ~2-3 seconds

### 2. Embedding Tests (9 tests)
Tests embedding generation and quality.

**What it tests:**
- Single/batch embedding generation
- Embedding consistency
- Dimensionality validation
- Semantic similarity
- Edge cases (special chars, empty strings)

**Run time:** ~7-8 seconds

### 3. Search Tests (9 tests)
Tests semantic search accuracy and performance.

**What it tests:**
- Basic search functionality
- Semantic accuracy (synonyms)
- Category filtering
- Ranking quality
- Multi-word queries
- Performance benchmarks

**Run time:** ~3-4 seconds

### 4. Recommendation Tests (9 tests)
Tests product recommendation functionality.

**What it tests:**
- Similar product finding
- Category-based recommendations
- Cross-category suggestions
- Recommendation diversity
- Scoring quality
- Performance

**Run time:** ~5-6 seconds

### 5. Integration Tests (9 tests)
End-to-end workflow testing.

**What it tests:**
- Complete CRUD workflows
- Bulk data operations
- Concurrent access
- Error recovery
- Real-world scenarios
- Data persistence

**Run time:** ~17-18 seconds

## Expected Results

### Successful Test Run
```
Total Tests:  45
Passed:       45 (100.0%)
Failed:       0
Duration:     36116ms (36.12s)
Overall Health: EXCELLENT
```

### System Proof
```
Database Operational:      ✓ YES
Embeddings Working:        ✓ YES
Search Accurate:           ✓ YES
Recommendations Working:   ✓ YES
Integration Passing:       ✓ YES
```

### Performance Benchmarks
| Operation | Expected Time | Status |
|-----------|--------------|--------|
| Create Collection | < 200ms | ✓ |
| Insert Single Doc | < 100ms | ✓ |
| Batch Insert (100) | < 2000ms | ✓ |
| Generate Embedding | < 500ms | ✓ |
| Search Query | < 1000ms | ✓ |
| Recommendation | < 500ms | ✓ |

### Accuracy Metrics
| Metric | Target | Expected |
|--------|--------|----------|
| Search Precision | ≥ 50% | 70%+ |
| Search Recall | ≥ 50% | 65%+ |
| Semantic Similarity | ≥ 70% | 85%+ |
| Embedding Consistency | 100% | 100% |

## Troubleshooting

### Issue: "npx ruvector command not found"
**Solution:** Ensure @ruvector/core is installed
```bash
npm install @ruvector/core
```

### Issue: Tests timing out
**Solution:** Increase timeout or check system resources
- Tests have 30-60 second timeouts
- Reduce batch sizes if needed
- Check available memory

### Issue: Embedding dimension mismatch
**Solution:** Verify ruvector configuration
- Check model configuration
- Ensure consistent dimensions (384)
- Restart if necessary

### Issue: Low accuracy scores
**Solution:** This might be expected for mock/test data
- Real data typically performs better
- Check if using appropriate test products
- Verify embedding model is loaded

### Issue: Permission errors
**Solution:** Check directory permissions
```bash
chmod -R 755 /home/user/ecai/data
mkdir -p /home/user/ecai/data
```

## Test Data

Tests use synthetic test data:
- Product catalog with 10-100 items
- Various categories (Electronics, Clothing, Sports, etc.)
- Realistic product descriptions
- 384-dimensional embeddings

## Customization

### Modify Test Configuration
Edit test files to change:
- Batch sizes
- Number of test products
- Timeout values
- Vector dimensions
- Test criteria

### Add New Tests
1. Create test method in appropriate test class
2. Name it `test<YourTestName>()`
3. Return `TestResult` object
4. Add pass/fail criteria
5. Include performance metrics

Example:
```typescript
async testMyNewTest(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    // Your test logic here
    return {
      passed: true,
      details: {
        duration: Date.now() - startTime,
        // ... metrics
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      error: error.message,
      details: { duration: Date.now() - startTime }
    };
  }
}
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run RuVector Tests
  run: npm test

- name: Upload Test Report
  uses: actions/upload-artifact@v3
  with:
    name: test-report
    path: test-report.json
```

### Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| test-runner.ts | Main orchestrator | 456 |
| database-test.ts | Database tests | 398 |
| embedding-test.ts | Embedding tests | 341 |
| search-test.ts | Search tests | 465 |
| recommendation-test.ts | Recommendation tests | 457 |
| integration-test.ts | Integration tests | 544 |
| run-tests.ts | Execution script | 25 |

## Documentation

Comprehensive documentation available in:
- `/home/user/ecai/src/ruvector/tests/README.md` - Complete guide
- `/home/user/ecai/RUVECTOR_TEST_SUITE_SUMMARY.md` - Full summary
- `/home/user/ecai/SAMPLE_TEST_OUTPUT.md` - Sample output
- `/home/user/ecai/QUICK_START_TESTS.md` - This file

## Support

For questions or issues:
1. Check the README.md for detailed documentation
2. Review SAMPLE_TEST_OUTPUT.md for expected output
3. Verify all dependencies are installed
4. Check test-report.json for detailed error information

## Quick Commands Cheat Sheet

```bash
# Run all tests
npm test

# View test report summary
cat test-report.json | jq '.systemProof'

# Check if tests passed
cat test-report.json | jq '.totalFailed'

# View timing for all suites
cat test-report.json | jq '.suites[] | {suite: .suite, duration: .duration}'

# View failed tests only
cat test-report.json | jq '.suites[].tests[] | select(.passed == false)'

# Get average metrics
cat test-report.json | jq '.systemProof.metrics'
```

---

**Ready to test? Run `npm test` now!**
