require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('../server/models/Product');
const User = require('../server/models/User');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/material-mover';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB for seeding 500 products');

  // Ensure there's a seller account to attach products to
  const sellerEmail = 'bulk-seller@example.com';
  const pwd = await bcrypt.hash('password123', 10);
  let seller = await User.findOne({ email: sellerEmail });
  if (!seller) {
    seller = new User({ email: sellerEmail, password: pwd, role: 'seller' });
    await seller.save();
    console.log('Created seller account:', sellerEmail);
  } else {
    console.log('Using existing seller account:', sellerEmail);
  }

  // Remove any previous bulk-inserted products (optional)
  // await Product.deleteMany({ title: /Bulk Product/ });

  // Build product data
  const categories = Product.CATEGORIES || [ 'Other' ];
  const adjectives = ['Premium', 'Standard', 'High-Grade', 'Industrial', 'Commercial', 'Durable', 'Lightweight', 'Heavy-Duty', 'Reinforced', 'Eco'];
  const items = ['Plywood Sheet', 'Cement Bag 50kg', 'Steel Rod 10mm', 'Bricks Pack', 'Concrete Mix', 'Roof Tile', 'Paint 20L', 'Gravel Bulk', 'Sand Truck', 'Insulation Roll', 'PVC Pipe', 'Door Frame', 'Window Glass', 'Nails Box', 'Screws Box'];

  const products = [];
  for (let i = 1; i <= 500; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const item = items[Math.floor(Math.random() * items.length)];
    const title = `${adj} ${item} ${i}`;
    const desc = `${adj} ${item} suitable for construction and building projects. Batch ${i}.`;

    // Price ranges depending roughly on item
    let baseMin = 100;
    let baseMax = 10000;
    if (/Cement|Concrete|Gravel|Sand/i.test(item)) { baseMin = 200; baseMax = 1200; }
    if (/Steel|Rod|Plywood|Door|Tile|Glass|Pipe/i.test(item)) { baseMin = 500; baseMax = 15000; }
    if (/Paint|Insulation/i.test(item)) { baseMin = 400; baseMax = 8000; }

    const price = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * 100) / 100;
    const quantity = Math.floor(1 + Math.random() * 200);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const image = '/images/placeholder.png';

    // Generate random address and phone number
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata'];
    const areas = ['Industrial Area', 'Warehouse Complex', 'Manufacturing Hub', 'Business Park', 'Storage Yard'];
    const address = `${Math.floor(Math.random() * 999) + 1}, ${areas[Math.floor(Math.random() * areas.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;
    const phone_no = `98${Math.floor(Math.random() * 90000000 + 10000000)}`; // Generate 10-digit number starting with 98

    products.push({
      title,
      description: desc,
      price,
      quantity,
      category,
      image,
      address,
      phone_no,
      seller: seller._id
    });
  }

  // Insert in chunks to avoid overwhelming memory
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const res = await Product.insertMany(chunk);
    inserted += res.length;
    console.log(`Inserted ${inserted}/${products.length}`);
  }

  console.log('Done inserting products. Total inserted:', inserted);
  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });