const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./src/models/Order');
const Product = require('./src/models/Product');

async function testProductTemplates() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // First let's check what products with templates look like
  const sampleProducts = await Product.find({
    $or: [
      { 'designTemplate.imageUrl': { $exists: true, $ne: '' } },
      { 'designTemplates': { $exists: true, $type: 'array', $ne: [] } }
    ]
  }).limit(3).select('sku designTemplate designTemplates');
  
  console.log('📦 Sample products with templates:');
  console.log(JSON.stringify(sampleProducts, null, 2));
  
  // Check specific SKU mentioned by user
  const winProduct = await Product.findOne({ sku: /win54/ }).select('sku designTemplate designTemplates');
  console.log('\n🎯 win54 product:');
  console.log(JSON.stringify(winProduct, null, 2));
  
  mongoose.disconnect();
}

testProductTemplates().catch(console.error);