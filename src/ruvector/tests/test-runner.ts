/**
 * Test Runner - Comprehensive test suite for ruvector system
 * Runs all tests and generates proof of working system
 */

import { DatabaseTest } from './database-test';
import { EmbeddingTest } from './embedding-test';
import { SearchTest } from './search-test';
import { RecommendationTest } from './recommendation-test';
import { IntegrationTest } from './integration-test';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuiteResult {
  suite: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestResult[];
}

export interface TestReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: TestSuiteResult[];
  systemProof: SystemProof;
}

export interface SystemProof {
  databaseOperational: boolean;
  embeddingsWorking: boolean;
  searchAccurate: boolean;
  recommendationsWorking: boolean;
  integrationPassing: boolean;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'FAILING';
  metrics: {
    avgSearchAccuracy: number;
    avgSearchTime: number;
    avgEmbeddingTime: number;
    vectorDimension: number;
    testDataSize: number;
  };
}

export class TestRunner {
  private results: TestSuiteResult[] = [];
  private verbose: boolean;

  constructor(verbose = true) {
    this.verbose = verbose;
  }

  /**
   * Run all test suites
   */
  async runAll(): Promise<TestReport> {
    this.log('='.repeat(80));
    this.log('RUVECTOR COMPREHENSIVE TEST SUITE');
    this.log('='.repeat(80));
    this.log('');

    const startTime = Date.now();

    // Run test suites in order
    const databaseResults = await this.runSuite('Database Tests', new DatabaseTest());
    const embeddingResults = await this.runSuite('Embedding Tests', new EmbeddingTest());
    const searchResults = await this.runSuite('Search Tests', new SearchTest());
    const recommendationResults = await this.runSuite('Recommendation Tests', new RecommendationTest());
    const integrationResults = await this.runSuite('Integration Tests', new IntegrationTest());

    const totalDuration = Date.now() - startTime;

    // Calculate totals
    const totalTests = this.results.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0);

    // Generate system proof
    const systemProof = this.generateSystemProof();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalSuites: this.results.length,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      suites: this.results,
      systemProof
    };

    // Print summary
    this.printSummary(report);

    return report;
  }

  /**
   * Run a single test suite
   */
  private async runSuite(suiteName: string, testInstance: any): Promise<TestSuiteResult> {
    this.log('');
    this.log('-'.repeat(80));
    this.log(`Running: ${suiteName}`);
    this.log('-'.repeat(80));

    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Get all test methods (methods starting with 'test')
    const testMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(testInstance))
      .filter(method => method.startsWith('test') && typeof testInstance[method] === 'function');

    let passed = 0;
    let failed = 0;

    for (const method of testMethods) {
      const testName = this.formatTestName(method);
      const testStartTime = Date.now();

      try {
        this.log(`  Running: ${testName}...`);
        const result = await testInstance[method]();
        const duration = Date.now() - testStartTime;

        if (result.passed) {
          passed++;
          this.log(`  ✓ PASS: ${testName} (${duration}ms)`);
          if (this.verbose && result.details) {
            this.logDetails(result.details);
          }
        } else {
          failed++;
          this.log(`  ✗ FAIL: ${testName} (${duration}ms)`);
          if (result.error) {
            this.log(`    Error: ${result.error}`);
          }
        }

        tests.push({
          name: testName,
          passed: result.passed,
          duration,
          error: result.error,
          details: result.details
        });
      } catch (error: any) {
        failed++;
        const duration = Date.now() - testStartTime;
        this.log(`  ✗ FAIL: ${testName} (${duration}ms)`);
        this.log(`    Error: ${error.message}`);

        tests.push({
          name: testName,
          passed: false,
          duration,
          error: error.message
        });
      }
    }

    const suiteResult: TestSuiteResult = {
      suite: suiteName,
      totalTests: tests.length,
      passed,
      failed,
      duration: Date.now() - startTime,
      tests
    };

    this.results.push(suiteResult);

    this.log('');
    this.log(`Suite completed: ${passed}/${tests.length} passed (${suiteResult.duration}ms)`);

    return suiteResult;
  }

  /**
   * Generate system proof from test results
   */
  private generateSystemProof(): SystemProof {
    const databaseSuite = this.results.find(s => s.suite.includes('Database'));
    const embeddingSuite = this.results.find(s => s.suite.includes('Embedding'));
    const searchSuite = this.results.find(s => s.suite.includes('Search'));
    const recommendationSuite = this.results.find(s => s.suite.includes('Recommendation'));
    const integrationSuite = this.results.find(s => s.suite.includes('Integration'));

    const databaseOperational = databaseSuite ? databaseSuite.failed === 0 : false;
    const embeddingsWorking = embeddingSuite ? embeddingSuite.failed === 0 : false;
    const searchAccurate = searchSuite ? searchSuite.failed === 0 : false;
    const recommendationsWorking = recommendationSuite ? recommendationSuite.failed === 0 : false;
    const integrationPassing = integrationSuite ? integrationSuite.failed === 0 : false;

    // Calculate metrics
    const searchTests = searchSuite?.tests || [];
    const embeddingTests = embeddingSuite?.tests || [];

    const avgSearchAccuracy = this.calculateAverageMetric(searchTests, 'accuracy') || 0;
    const avgSearchTime = this.calculateAverageMetric(searchTests, 'avgTime') || 0;
    const avgEmbeddingTime = this.calculateAverageMetric(embeddingTests, 'avgTime') || 0;

    // Determine overall health
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalTests = this.results.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passRate = totalTests > 0 ? totalPassed / totalTests : 0;

    let overallHealth: SystemProof['overallHealth'];
    if (passRate >= 0.95) overallHealth = 'EXCELLENT';
    else if (passRate >= 0.80) overallHealth = 'GOOD';
    else if (passRate >= 0.60) overallHealth = 'FAIR';
    else if (passRate >= 0.40) overallHealth = 'POOR';
    else overallHealth = 'FAILING';

    return {
      databaseOperational,
      embeddingsWorking,
      searchAccurate,
      recommendationsWorking,
      integrationPassing,
      overallHealth,
      metrics: {
        avgSearchAccuracy,
        avgSearchTime,
        avgEmbeddingTime,
        vectorDimension: 384, // Default dimension
        testDataSize: 100
      }
    };
  }

  /**
   * Calculate average metric from test details
   */
  private calculateAverageMetric(tests: TestResult[], metricName: string): number {
    const values = tests
      .map(t => t.details?.[metricName])
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Print test summary
   */
  private printSummary(report: TestReport): void {
    this.log('');
    this.log('='.repeat(80));
    this.log('TEST SUMMARY');
    this.log('='.repeat(80));
    this.log('');
    this.log(`Total Suites: ${report.totalSuites}`);
    this.log(`Total Tests:  ${report.totalTests}`);
    this.log(`Passed:       ${report.totalPassed} (${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%)`);
    this.log(`Failed:       ${report.totalFailed}`);
    this.log(`Duration:     ${report.totalDuration}ms (${(report.totalDuration / 1000).toFixed(2)}s)`);
    this.log('');

    this.log('='.repeat(80));
    this.log('SYSTEM PROOF');
    this.log('='.repeat(80));
    this.log('');
    this.log(`Database Operational:      ${this.boolToStatus(report.systemProof.databaseOperational)}`);
    this.log(`Embeddings Working:        ${this.boolToStatus(report.systemProof.embeddingsWorking)}`);
    this.log(`Search Accurate:           ${this.boolToStatus(report.systemProof.searchAccurate)}`);
    this.log(`Recommendations Working:   ${this.boolToStatus(report.systemProof.recommendationsWorking)}`);
    this.log(`Integration Passing:       ${this.boolToStatus(report.systemProof.integrationPassing)}`);
    this.log(`Overall Health:            ${report.systemProof.overallHealth}`);
    this.log('');
    this.log('Metrics:');
    this.log(`  Avg Search Accuracy:     ${(report.systemProof.metrics.avgSearchAccuracy * 100).toFixed(1)}%`);
    this.log(`  Avg Search Time:         ${report.systemProof.metrics.avgSearchTime.toFixed(2)}ms`);
    this.log(`  Avg Embedding Time:      ${report.systemProof.metrics.avgEmbeddingTime.toFixed(2)}ms`);
    this.log(`  Vector Dimension:        ${report.systemProof.metrics.vectorDimension}`);
    this.log(`  Test Data Size:          ${report.systemProof.metrics.testDataSize} items`);
    this.log('');
    this.log('='.repeat(80));
  }

  /**
   * Format test method name
   */
  private formatTestName(method: string): string {
    return method
      .replace(/^test/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Convert boolean to status string
   */
  private boolToStatus(value: boolean): string {
    return value ? '✓ YES' : '✗ NO';
  }

  /**
   * Log message
   */
  private log(message: string): void {
    console.log(message);
  }

  /**
   * Log test details
   */
  private logDetails(details: any): void {
    if (typeof details === 'object' && details !== null) {
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'number') {
          this.log(`    ${key}: ${value}`);
        } else if (typeof value === 'string') {
          this.log(`    ${key}: ${value}`);
        } else if (Array.isArray(value)) {
          this.log(`    ${key}: [${value.length} items]`);
        }
      }
    }
  }

  /**
   * Save report to file
   */
  async saveReport(report: TestReport, filepath: string): Promise<void> {
    const fs = await import('fs');
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(filepath, json);
    this.log(`Report saved to: ${filepath}`);
  }
}

/**
 * Main test runner entry point
 */
export async function main() {
  const runner = new TestRunner(true);
  const report = await runner.runAll();

  // Save report
  const reportPath = '/home/user/ecai/test-report.json';
  await runner.saveReport(report, reportPath);

  // Exit with appropriate code
  process.exit(report.totalFailed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}
