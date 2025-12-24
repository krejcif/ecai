import { CzechDataFetcher } from '../data/czechDataFetcher';
import { DataProcessor } from '../data/dataProcessor';

// ============================================================================
// CZECH DATA PLATFORM DEMO
// ============================================================================

async function runDemo() {
  console.log('='.repeat(80));
  console.log('CZECH DATA PLATFORM - DEMONSTRATION');
  console.log('='.repeat(80));
  console.log();

  const fetcher = new CzechDataFetcher();
  const processor = new DataProcessor();

  try {
    // ========================================================================
    // 1. FETCH CNB EXCHANGE RATES
    // ========================================================================
    console.log('1. Fetching CNB Exchange Rates...');
    console.log('-'.repeat(80));

    const exchangeRates = await fetcher.fetchCNBExchangeRates();
    console.log(`✓ Fetched ${exchangeRates.length} exchange rates`);
    console.log('\nSample Exchange Rates:');
    exchangeRates.slice(0, 5).forEach(rate => {
      console.log(`  ${rate.code}: ${rate.amount} ${rate.currency} = ${rate.rate} CZK`);
    });

    // Normalize and analyze
    const normalizedRates = processor.normalizeExchangeRates(exchangeRates);
    console.log(`\n✓ Normalized ${normalizedRates.metadata?.recordCount} rates`);

    const rateStats = processor.analyzeExchangeRates(exchangeRates);
    console.log('\nExchange Rate Statistics:');
    console.log(`  Mean: ${rateStats.overall.mean.toFixed(4)}`);
    console.log(`  Median: ${rateStats.overall.median.toFixed(4)}`);
    console.log(`  Std Dev: ${rateStats.overall.stdDev.toFixed(4)}`);

    // Currency conversion example
    const eurRate = await fetcher.getExchangeRate('EUR');
    if (eurRate) {
      console.log(`\n✓ EUR Exchange Rate: 1 EUR = ${eurRate.rate} CZK`);
      const czkAmount = await fetcher.convertToCZK(100, 'EUR');
      console.log(`  100 EUR = ${czkAmount.toFixed(2)} CZK`);
    }

    console.log('\n');

    // ========================================================================
    // 2. FETCH BUSINESS INFORMATION FROM ARES
    // ========================================================================
    console.log('2. Fetching Business Information from ARES...');
    console.log('-'.repeat(80));

    // Example: Fetch České dráhy (Czech Railways) - IČO: 70994226
    const businessInfo = await fetcher.fetchBusinessInfo('70994226');
    if (businessInfo) {
      console.log('✓ Business Information:');
      console.log(`  Name: ${businessInfo.name}`);
      console.log(`  IČO: ${businessInfo.ico}`);
      console.log(`  Legal Form: ${businessInfo.legalForm || 'N/A'}`);
      if (businessInfo.address) {
        console.log(`  Address: ${businessInfo.address.city || 'N/A'}`);
      }
      console.log(`  Status: ${businessInfo.status || 'N/A'}`);
    }

    // Search for businesses
    console.log('\nSearching for businesses with "Praha"...');
    const businesses = await fetcher.searchBusinesses('Praha', 3);
    console.log(`✓ Found ${businesses.length} businesses`);
    businesses.forEach((biz, idx) => {
      console.log(`  ${idx + 1}. ${biz.name} (IČO: ${biz.ico})`);
    });

    console.log('\n');

    // ========================================================================
    // 3. FETCH PRAGUE OPEN DATA
    // ========================================================================
    console.log('3. Fetching Prague Open Data...');
    console.log('-'.repeat(80));

    const pragueDatasets = await fetcher.fetchPragueDatasets(5);
    console.log(`✓ Fetched ${pragueDatasets.length} datasets`);
    console.log('\nSample Datasets:');
    pragueDatasets.slice(0, 3).forEach((dataset, idx) => {
      console.log(`  ${idx + 1}. ${dataset.title}`);
      console.log(`     Organization: ${dataset.organization}`);
      console.log(`     Resources: ${dataset.resources.length}`);
    });

    // Fetch transport data
    console.log('\nFetching Prague Transport Data...');
    const transportData = await fetcher.fetchPragueTransportData();
    console.log(`✓ Found ${transportData.length} transport-related datasets`);

    console.log('\n');

    // ========================================================================
    // 4. STATISTICAL ANALYSIS
    // ========================================================================
    console.log('4. Statistical Analysis...');
    console.log('-'.repeat(80));

    // Analyze exchange rates
    const rates = exchangeRates.map(r => r.rate / r.amount);
    const stats = processor.calculateStatistics(rates);

    console.log('Exchange Rate Statistics:');
    console.log(`  Count: ${stats.count}`);
    console.log(`  Mean: ${stats.mean.toFixed(4)}`);
    console.log(`  Median: ${stats.median.toFixed(4)}`);
    console.log(`  Std Dev: ${stats.stdDev.toFixed(4)}`);
    console.log(`  Min: ${stats.min.toFixed(4)}`);
    console.log(`  Max: ${stats.max.toFixed(4)}`);

    // Calculate percentiles
    const p25 = processor.calculatePercentile(rates, 25);
    const p75 = processor.calculatePercentile(rates, 75);
    console.log(`\nPercentiles:`);
    console.log(`  25th: ${p25.toFixed(4)}`);
    console.log(`  75th: ${p75.toFixed(4)}`);

    // Moving average example
    console.log('\nMoving Average (window size 3):');
    const movingAvg = processor.calculateMovingAverage(rates.slice(0, 10), 3);
    movingAvg.slice(0, 5).forEach((avg, idx) => {
      console.log(`  Position ${idx}: ${avg.toFixed(4)}`);
    });

    console.log('\n');

    // ========================================================================
    // 5. DATA AGGREGATION
    // ========================================================================
    console.log('5. Data Aggregation...');
    console.log('-'.repeat(80));

    const aggregated = processor.aggregateExchangeRatesByCurrency(exchangeRates.slice(0, 10));
    console.log('Exchange Rates Aggregated by Currency:');
    aggregated.forEach(agg => {
      console.log(`  ${agg.groupBy}:`);
      console.log(`    Avg Rate: ${agg.aggregations.avgRate}`);
      console.log(`    Min Rate: ${agg.aggregations.minRate}`);
      console.log(`    Max Rate: ${agg.aggregations.maxRate}`);
      console.log(`    Count: ${agg.count}`);
    });

    console.log('\n');

    // ========================================================================
    // 6. DATA QUALITY VALIDATION
    // ========================================================================
    console.log('6. Data Quality Validation...');
    console.log('-'.repeat(80));

    const validation = processor.validateDataCompleteness(businesses, [
      'ico',
      'name',
      'legalForm',
      'address',
    ]);

    console.log('Data Completeness Report:');
    console.log(`  Complete: ${validation.isComplete ? 'Yes' : 'No'}`);
    console.log(`  Completeness Score: ${validation.completenessScore}%`);
    if (Object.keys(validation.missingFields).length > 0) {
      console.log('  Missing Fields:');
      Object.entries(validation.missingFields).forEach(([field, count]) => {
        console.log(`    ${field}: ${count} missing`);
      });
    }

    console.log('\n');

    // ========================================================================
    // DEMO COMPLETE
    // ========================================================================
    console.log('='.repeat(80));
    console.log('DEMO COMPLETE!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error running demo:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
