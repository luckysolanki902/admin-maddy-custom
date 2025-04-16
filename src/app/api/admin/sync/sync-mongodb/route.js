import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const PROD_DB_URI = process.env.PROD_DB_URI;
const TEST_DB_URI = process.env.TEST_DB_URI;

export async function GET() {
  try {
    const prodConnection = await mongoose.createConnection(PROD_DB_URI).asPromise();
    const testConnection = await mongoose.createConnection(TEST_DB_URI).asPromise();

    // Step 1: Drop ALL collections in test DB
    const testCollections = await testConnection.db.listCollections().toArray();
    for (const { name } of testCollections) {
      console.log(`Dropping test collection: ${name}`);
      try {
        await testConnection.db.dropCollection(name);
      } catch (err) {
        console.warn(`Failed to drop ${name} (maybe already dropped):`, err.message);
      }
    }

    // Step 2: Copy all collections from prod DB
    const prodCollections = await prodConnection.db.listCollections().toArray();
    const totalCollections = prodCollections.length;
    console.log(`Syncing ${totalCollections} collections from production to test database`);

    for (const [index, { name }] of prodCollections.entries()) {
      console.log(`Syncing collection ${name} (${index + 1}/${totalCollections})`);
      const prodData = await prodConnection.db.collection(name).find().toArray();

      if (prodData.length > 0) {
        await testConnection.db.collection(name).insertMany(prodData);
        console.log(`Inserted ${prodData.length} documents into ${name}`);
      } else {
        // Create empty collection if prod has it but it's empty
        await testConnection.db.createCollection(name);
        console.log(`Created empty collection ${name}`);
      }
    }

    await prodConnection.close();
    await testConnection.close();

    return NextResponse.json({ message: 'Test DB fully wiped and synced from production' });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync databases' }, { status: 500 });
  }
}
