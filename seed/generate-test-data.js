require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('../server/models/Product');
const User = require('../server/models/User');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/material-mover';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB for seeding');

  // Create default users first
  const pwd = await bcrypt.hash('password123', 10);
  const defaultUsers = [
    { email: 'buyer@example.com', password: pwd, role: 'buyer' },
    { email: 'seller@example.com', password: pwd, role: 'seller' },
    { email: 'admin@example.com', password: pwd, role: 'admin' }
  ];

  const seller = await User.findOneAndUpdate(
    { email: 'seller@example.com' },
    defaultUsers[1],
    { upsert: true, new: true }
  );

  for (const user of [defaultUsers[0], defaultUsers[2]]) {
    await User.findOneAndUpdate(
      { email: user.email },
      user,
      { upsert: true, new: true }
    );
  }

  // Only delete example products
  await Product.deleteMany({});

  // Insert example products if none exist
  const products = [
    { title: 'Plywood 8x4', description: 'High quality plywood sheet', price: 1800, image: '/images/plywood.jpg', category: 'Wood', quantity: 50, seller: seller._id },
    { title: 'Cement 50kg', description: 'Portland cement bag', price: 550, image: '/images/cement.jpg', category: 'Cement', quantity: 100, seller: seller._id },
    { title: 'Steel Rod 10mm', description: 'Rebar for construction', price: 850, image: '/images/rod.jpg', category: 'Metals', quantity: 75, seller: seller._id }
  ];
  
  await Product.insertMany(products);
  console.log('Seed done');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });