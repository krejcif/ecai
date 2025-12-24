#!/usr/bin/env tsx

/**
 * Script to run the ruvector test suite
 */

import { TestRunner } from '../src/ruvector/tests/test-runner';

async function main() {
  console.log('Starting ruvector test suite...\n');

  const runner = new TestRunner(true);
  const report = await runner.runAll();

  // Save report
  const reportPath = '/home/user/ecai/test-report.json';
  await runner.saveReport(report, reportPath);

  console.log('\n');
  console.log('Test execution completed!');
  console.log(`Full report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(report.totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
