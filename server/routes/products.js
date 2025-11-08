const express = require('express');
const router = express.Router();
const axios = require('axios');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// POST /api/products/search -> send { query } to external webhook, receive product ids, return products
router.post('/search', auth([]), async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: 'query required' });
  
  try {
    // Try webhook search first if configured
    const webhook = process.env.SEARCH_WEBHOOK_URL;
    if (webhook) {
      try {
        const resp = await axios.post(webhook, { query });
        let ids = [];
        if (Array.isArray(resp.data)) ids = resp.data;
        else if (Array.isArray(resp.data.productIds)) ids = resp.data.productIds;
        else if (Array.isArray(resp.data.ids)) ids = resp.data.ids;
        
        if (ids.length > 0) {
          const products = await Product.find({ _id: { $in: ids } });
          if (products.length > 0) {
            return res.json({ products, source: 'webhook' });
          }
        }
      } catch (webhookErr) {
        console.log('Webhook search failed, falling back to local search:', webhookErr.message);
      }
    }

    // Fall back to local search if webhook fails or returns no results
    const searchRegex = new RegExp(query, 'i');
    const products = await Product.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    }).limit(50);

    res.json({ products, source: 'local' });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// GET /api/products/categories - get all categories
router.get('/categories', auth([]), async (req, res) => {
  res.json({ categories: Product.CATEGORIES });
});

// GET /api/products?ids=comma,separated
router.get('/', auth([]), async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  try {
    if (!ids.length) {
      const all = await Product.find().limit(50);
      return res.json({ products: all });
    }
    const products = await Product.find({ _id: { $in: ids } });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products (seller only) - create product
router.post('/', auth(['seller', 'admin']), async (req, res) => {
  const { title, description, price, quantity, category, image, address, phone_no } = req.body;
  try {
    // Validate required fields
    if (!title || !description || !category || typeof price !== 'number' || typeof quantity !== 'number' || !address || !phone_no) {
      return res.status(400).json({ 
        message: 'Missing required fields. Title, description, category, price, quantity, address, and phone number are required.' 
      });
    }

    // Validate price and quantity
    if (price < 0) {
      return res.status(400).json({ message: 'Price must be greater than or equal to 0' });
    }
    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be greater than or equal to 0' });
    }

    // Create and save the product
    const p = new Product({ 
      title, 
      description, 
      price, 
      quantity,
      category,
      image,
      address,
      phone_no,
      seller: req.user.id
    });
    
    await p.save();
    res.json({ product: p });
  } catch (err) {
    console.error('Product creation error:', err);
    // Send more detailed error message
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(400).json({ message: 'Error creating product', error: err.message });
  }
});

// GET /api/products/my - get seller's products
router.get('/my', auth(['seller', 'admin']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id - get single product (public)
router.get('/:id', auth([]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id - update product (seller or admin)
router.put('/:id', auth(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only owner or admin can update
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this product' });
    }

    const { title, description, price, quantity, category, image } = req.body;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;

    await product.save();
    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: Object.values(err.errors).map(e => e.message) });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id - delete product (seller can only delete their own)
router.delete('/:id', auth(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product or is admin
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
