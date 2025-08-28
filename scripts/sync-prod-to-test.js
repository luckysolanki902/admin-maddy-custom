#!/usr/bin/env node

/**
 * Database Sync Script
 * 
 * This script clears all test database collections and copies all collections
 * from production database to test database.
 * 
 * Usage:
 *   node scripts/sync-prod-to-test.js
 * 
 * Environment Variables Required:
 *   PROD_DB_URI - MongoDB connection string for production database
 *   TEST_DB_URI - MongoDB connection string for test database
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  
  // Try to load .env.local first, then .env
  const envFile = fs.existsSync(envLocalPath) ? envLocalPath : 
                  fs.existsSync(envPath) ? envPath : null;
  
  if (envFile) {
    console.log(`📂 Loading environment from: ${envFile}`);
    const envContent = fs.readFileSync(envFile, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  } else {
    console.log('⚠️  No .env or .env.local file found. Expecting environment variables to be set.');
  }
}

async function syncDatabases() {
  const startTime = Date.now();
  
  console.log('🚀 Starting database sync process...\n');
  
  // Load environment variables
  loadEnvFile();
  
  const PROD_DB_URI = process.env.PROD_DB_URI;
  const TEST_DB_URI = process.env.TEST_DB_URI;
  
  // Validate environment variables
  if (!PROD_DB_URI) {
    throw new Error('❌ PROD_DB_URI environment variable is not set');
  }
  
  if (!TEST_DB_URI) {
    throw new Error('❌ TEST_DB_URI environment variable is not set');
  }
  
  console.log('✅ Environment variables loaded successfully');
  console.log(`📊 Production DB: ${PROD_DB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log(`🧪 Test DB: ${TEST_DB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}\n`);
  
  let prodConnection, testConnection;
  
  try {
    // Create connections
    console.log('🔗 Connecting to production database...');
    prodConnection = await mongoose.createConnection(PROD_DB_URI).asPromise();
    console.log('✅ Connected to production database');
    
    console.log('🔗 Connecting to test database...');
    testConnection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    console.log('✅ Connected to test database\n');
    
    // Step 1: Clear test database
    console.log('🧹 Step 1: Clearing test database...');
    const testCollections = await testConnection.db.listCollections().toArray();
    
    if (testCollections.length === 0) {
      console.log('📝 Test database is already empty');
    } else {
      console.log(`📝 Found ${testCollections.length} collections to drop`);
      
      for (const { name } of testCollections) {
        try {
          await testConnection.db.dropCollection(name);
          console.log(`   ✅ Dropped collection: ${name}`);
        } catch (err) {
          console.warn(`   ⚠️  Failed to drop ${name} (may not exist): ${err.message}`);
        }
      }
    }
    
    console.log('✅ Test database cleared successfully\n');
    
    // Step 2: Copy from production
    console.log('📋 Step 2: Copying collections from production...');
    const prodCollections = await prodConnection.db.listCollections().toArray();
    
    if (prodCollections.length === 0) {
      console.log('📝 Production database has no collections');
      return;
    }
    
    console.log(`📝 Found ${prodCollections.length} collections in production`);
    
    let totalDocuments = 0;
    const collectionStats = [];
    
    for (const [index, { name }] of prodCollections.entries()) {
      try {
        console.log(`   📊 Processing collection ${index + 1}/${prodCollections.length}: ${name}`);
        
        const prodData = await prodConnection.db.collection(name).find().toArray();
        const documentCount = prodData.length;
        
        if (documentCount > 0) {
          await testConnection.db.collection(name).insertMany(prodData);
          console.log(`   ✅ Copied ${documentCount} documents to ${name}`);
        } else {
          // Create empty collection to maintain structure
          await testConnection.db.createCollection(name);
          console.log(`   ✅ Created empty collection: ${name}`);
        }
        
        totalDocuments += documentCount;
        collectionStats.push({ name, count: documentCount });
        
      } catch (error) {
        console.error(`   ❌ Error processing collection ${name}:`, error.message);
        throw error;
      }
    }
    
    console.log('\n📊 Sync Summary:');
    console.log(`   📁 Collections copied: ${prodCollections.length}`);
    console.log(`   📄 Total documents copied: ${totalDocuments}`);
    console.log(`   ⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    
    console.log('\n📋 Collection Details:');
    collectionStats
      .sort((a, b) => b.count - a.count)
      .forEach(({ name, count }) => {
        console.log(`   ${name.padEnd(25)} : ${count.toLocaleString()} documents`);
      });
    
    console.log('\n🎉 Database sync completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database sync failed:', error.message);
    throw error;
  } finally {
    // Clean up connections
    if (prodConnection) {
      await prodConnection.close();
      console.log('🔌 Production database connection closed');
    }
    if (testConnection) {
      await testConnection.close();
      console.log('🔌 Test database connection closed');
    }
  }
}

// Handle script execution
if (require.main === module) {
  syncDatabases()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { syncDatabases };
