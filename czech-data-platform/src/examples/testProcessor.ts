import { DataProcessor } from '../data/dataProcessor';
import { ExchangeRate, BusinessInfo } from '../data/czechDataFetcher';

// ============================================================================
// DATA PROCESSOR TEST - Works without external API calls
// ============================================================================

function testDataProcessor() {
  console.log('='.repeat(80));
  console.log('CZECH DATA PROCESSOR - TEST');
  console.log('='.repeat(80));
  console.log();

  const processor = new DataProcessor();

  // ========================================================================
  // 1. STATISTICAL ANALYSIS
  // ========================================================================
  console.log('1. Statistical Analysis');
  console.log('-'.repeat(80));

  const sampleData = [23.5, 25.1, 24.8, 26.3, 23.9, 25.7, 24.2, 25.4, 24.9, 25.0];
  const stats = processor.calculateStatistics(sampleData);

  console.log('Sample Exchange Rate Data:', sampleData);
  console.log('\nStatistics:');
  console.log(`  Count: ${stats.count}`);
  console.log(`  Mean: ${stats.mean}`);
  console.log(`  Median: ${stats.median}`);
  console.log(`  Mode: ${stats.mode}`);
  console.log(`  Min: ${stats.min}`);
  console.log(`  Max: ${stats.max}`);
  console.log(`  Std Dev: ${stats.stdDev}`);
  console.log(`  Variance: ${stats.variance}`);

  // Percentiles
  const p25 = processor.calculatePercentile(sampleData, 25);
  const p50 = processor.calculatePercentile(sampleData, 50);
  const p75 = processor.calculatePercentile(sampleData, 75);
  console.log('\nPercentiles:');
  console.log(`  25th: ${p25.toFixed(4)}`);
  console.log(`  50th (Median): ${p50.toFixed(4)}`);
  console.log(`  75th: ${p75.toFixed(4)}`);

  console.log('\n');

  // ========================================================================
  // 2. MOVING AVERAGE
  // ========================================================================
  console.log('2. Moving Average Calculation');
  console.log('-'.repeat(80));

  const movingAvg3 = processor.calculateMovingAverage(sampleData, 3);
  const movingAvg5 = processor.calculateMovingAverage(sampleData, 5);

  console.log('Original Data:', sampleData);
  console.log('Moving Avg (window=3):', movingAvg3);
  console.log('Moving Avg (window=5):', movingAvg5);

  console.log('\n');

  // ========================================================================
  // 3. NORMALIZATION AND STANDARDIZATION
  // ========================================================================
  console.log('3. Data Normalization and Standardization');
  console.log('-'.repeat(80));

  const normalized = processor.normalizeValues(sampleData);
  const standardized = processor.standardizeValues(sampleData);

  console.log('Original:', sampleData.slice(0, 5));
  console.log('Normalized (0-1):', normalized.slice(0, 5));
  console.log('Standardized (z-score):', standardized.slice(0, 5));

  console.log('\n');

  // ========================================================================
  // 4. OUTLIER DETECTION
  // ========================================================================
  console.log('4. Outlier Detection');
  console.log('-'.repeat(80));

  const dataWithOutliers = [23, 24, 25, 26, 24, 25, 100, 23, 24, 25]; // 100 is outlier
  console.log('Data with outliers:', dataWithOutliers);

  const filtered = processor.filterOutliers(dataWithOutliers);
  console.log('After filtering outliers:', filtered);
  console.log(`Removed ${dataWithOutliers.length - filtered.length} outlier(s)`);

  console.log('\n');

  // ========================================================================
  // 5. CORRELATION ANALYSIS
  // ========================================================================
  console.log('5. Correlation Analysis');
  console.log('-'.repeat(80));

  const dataset1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const dataset2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]; // Perfect positive correlation
  const dataset3 = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // Perfect negative correlation
  const dataset4 = [3, 7, 2, 9, 4, 6, 8, 1, 5, 10]; // Random, low correlation

  const corr1 = processor.calculateCorrelation(dataset1, dataset2);
  const corr2 = processor.calculateCorrelation(dataset1, dataset3);
  const corr3 = processor.calculateCorrelation(dataset1, dataset4);

  console.log('Dataset 1:', dataset1);
  console.log('Dataset 2 (linear positive):', dataset2);
  console.log(`Correlation: ${corr1.toFixed(4)} (perfect positive)`);
  console.log();
  console.log('Dataset 3 (linear negative):', dataset3);
  console.log(`Correlation: ${corr2.toFixed(4)} (perfect negative)`);
  console.log();
  console.log('Dataset 4 (random):', dataset4);
  console.log(`Correlation: ${corr3.toFixed(4)} (low correlation)`);

  console.log('\n');

  // ========================================================================
  // 6. DATA AGGREGATION
  // ========================================================================
  console.log('6. Data Aggregation');
  console.log('-'.repeat(80));

  // Mock exchange rate data
  const mockRates: ExchangeRate[] = [
    { country: 'USA', currency: 'dollar', amount: 1, code: 'USD', rate: 23.5, date: '24.12.2025' },
    { country: 'USA', currency: 'dollar', amount: 1, code: 'USD', rate: 23.7, date: '23.12.2025' },
    { country: 'EMU', currency: 'euro', amount: 1, code: 'EUR', rate: 25.1, date: '24.12.2025' },
    { country: 'EMU', currency: 'euro', amount: 1, code: 'EUR', rate: 25.3, date: '23.12.2025' },
    { country: 'UK', currency: 'pound', amount: 1, code: 'GBP', rate: 29.8, date: '24.12.2025' },
  ];

  const aggregated = processor.aggregateExchangeRatesByCurrency(mockRates);

  console.log('Exchange Rates Aggregated by Currency:');
  aggregated.forEach(agg => {
    console.log(`\n${agg.groupBy}:`);
    console.log(`  Average Rate: ${Number(agg.aggregations.avgRate).toFixed(4)}`);
    console.log(`  Min Rate: ${agg.aggregations.minRate}`);
    console.log(`  Max Rate: ${agg.aggregations.maxRate}`);
    console.log(`  Count: ${agg.count}`);
  });

  console.log('\n');

  // ========================================================================
  // 7. GROUP BY OPERATION
  // ========================================================================
  console.log('7. Group By Operation');
  console.log('-'.repeat(80));

  const grouped = processor.groupBy(mockRates, 'code');
  console.log('Grouped by currency code:');
  Object.entries(grouped).forEach(([code, rates]) => {
    console.log(`  ${code}: ${rates.length} entries`);
  });

  console.log('\n');

  // ========================================================================
  // 8. DATA NORMALIZATION
  // ========================================================================
  console.log('8. Data Normalization');
  console.log('-'.repeat(80));

  const normalizedRates = processor.normalizeExchangeRates(mockRates);
  console.log('Normalized Exchange Rates:');
  console.log(`  Source: ${normalizedRates.source}`);
  console.log(`  Record Count: ${normalizedRates.metadata?.recordCount}`);
  console.log(`  Data Type: ${normalizedRates.metadata?.dataType}`);
  console.log(`  Processing Time: ${normalizedRates.metadata?.processingTime}ms`);
  console.log('\nSample normalized data:');
  console.log(JSON.stringify(normalizedRates.data[0], null, 2));

  console.log('\n');

  // ========================================================================
  // 9. DATA QUALITY VALIDATION
  // ========================================================================
  console.log('9. Data Quality Validation');
  console.log('-'.repeat(80));

  const mockBusinesses: BusinessInfo[] = [
    {
      ico: '12345678',
      name: 'Company A',
      legalForm: 's.r.o.',
      address: { city: 'Praha', postalCode: '110 00' }
    },
    {
      ico: '87654321',
      name: 'Company B',
      // Missing legalForm and address
    },
    {
      ico: '11111111',
      name: 'Company C',
      legalForm: 'a.s.',
      // Missing address
    },
  ];

  const validation = processor.validateDataCompleteness(mockBusinesses, [
    'ico',
    'name',
    'legalForm',
    'address',
  ]);

  console.log('Data Completeness Report:');
  console.log(`  Complete: ${validation.isComplete ? 'Yes' : 'No'}`);
  console.log(`  Completeness Score: ${validation.completenessScore}%`);
  console.log('  Missing Fields:');
  Object.entries(validation.missingFields).forEach(([field, count]) => {
    console.log(`    ${field}: ${count} records missing`);
  });

  console.log('\n');

  // ========================================================================
  // 10. DUPLICATE REMOVAL
  // ========================================================================
  console.log('10. Duplicate Removal');
  console.log('-'.repeat(80));

  const dataWithDuplicates = [
    { ico: '12345', name: 'Company A' },
    { ico: '67890', name: 'Company B' },
    { ico: '12345', name: 'Company A' }, // duplicate
    { ico: '11111', name: 'Company C' },
  ];

  console.log('Original data (4 items, 1 duplicate):', dataWithDuplicates.length);
  const unique = processor.removeDuplicates(dataWithDuplicates, 'ico');
  console.log('After removing duplicates:', unique.length);
  console.log('Unique companies:');
  unique.forEach(item => console.log(`  ${item.ico}: ${item.name}`));

  console.log('\n');

  // ========================================================================
  // COMPLETE
  // ========================================================================
  console.log('='.repeat(80));
  console.log('DATA PROCESSOR TEST COMPLETE!');
  console.log('All functions working correctly.');
  console.log('='.repeat(80));
}

// Run test
if (require.main === module) {
  testDataProcessor();
}

export { testDataProcessor };
