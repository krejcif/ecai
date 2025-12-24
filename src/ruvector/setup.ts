/**
 * Ruvector Database Setup Script
 * Initializes all vector databases for the product intelligence system
 */

import { dbManager } from './database';
import { ruvectorConfig, getAllDatabaseConfigs } from './config';

async function setupDatabases() {
  console.log('='.repeat(60));
  console.log('Ruvector Database Setup');
  console.log('AI-Powered Product Intelligence System');
  console.log('='.repeat(60));
  console.log();

  console.log(`Data Directory: ${ruvectorConfig.dataDir}`);
  console.log();

  console.log('Database Configuration:');
  console.log('-'.repeat(60));
  const configs = getAllDatabaseConfigs();
  configs.forEach(config => {
    console.log(`  ${config.name.padEnd(12)} - ${config.dimensions}D - ${config.description}`);
  });
  console.log();

  try {
    // Create all databases
    await dbManager.createAllDatabases();
    console.log();

    // Get and display stats
    console.log('Database Status:');
    console.log('-'.repeat(60));
    const stats = await dbManager.getAllStats();
    stats.forEach(stat => {
      const status = stat.exists ? '✓ EXISTS' : '✗ MISSING';
      const count = stat.vectorCount !== undefined ? ` (${stat.vectorCount} vectors)` : '';
      console.log(`  ${stat.name.padEnd(12)} ${status}${count}`);
    });
    console.log();

    console.log('='.repeat(60));
    console.log('✓ Setup Complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if executed directly
if (require.main === module) {
  setupDatabases().catch(console.error);
}

export { setupDatabases };
