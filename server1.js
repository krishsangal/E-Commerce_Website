require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yuktiai', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Database Models
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  imageUrl: String,
  licenseType: String,
  supportLevel: String,
  aiEmbedding: [Number],
  ecoScore: Number
}));

const Cart = mongoose.model('Cart', new mongoose.Schema({
  userId: String,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    priceAtAddition: Number
  }],
  couponCode: String,
  discount: Number
}));

// Helper Functions
const calculateCartTotals = async (cart) => {
  const populatedItems = await Promise.all(cart.items.map(async item => {
    const product = await Product.findById(item.productId);
    return {
      ...item.toObject(),
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl
      }
    };
  }));

  const subtotal = populatedItems.reduce(
    (sum, item) => sum + (item.priceAtAddition * item.quantity), 0
  );
  const total = subtotal - (cart.discount || 0);

  return {
    items: populatedItems,
    subtotal,
    discount: cart.discount || 0,
    total
  };
};

// API Routes

// Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart
app.get('/api/cart/:userId', async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) return res.json({ items: [], subtotal: 0, discount: 0, total: 0 });
    res.json(await calculateCartTotals(cart));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/:userId/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) cart = new Cart({ userId: req.params.userId, items: [] });

    const existingItem = cart.items.find(item => 
      item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        priceAtAddition: product.price
      });
    }

    await cart.save();
    res.status(201).json(await calculateCartTotals(cart));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/cart/:userId/items/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.params.userId });
    
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.quantity = quantity;
    await cart.save();
    res.json(await calculateCartTotals(cart));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/cart/:userId/items/:itemId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    cart.items.pull(req.params.itemId);
    await cart.save();
    res.json(await calculateCartTotals(cart));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const recommendations = await Product.aggregate([
      { $sample: { size: 5 } }
    ]);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('YuktiAI Backend is running!');
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize with sample data if empty
async function initializeSampleData() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      {
        name: "SmartRecommend AI Engine",
        description: "Cloud-based personalized recommendation system",
        price: 1299,
        category: "AI Software",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        licenseType: "annual",
        supportLevel: "premium",
        aiEmbedding: [0.1, 0.5, 0.3],
        ecoScore: 7.5
      },
      {
        name: "Customer Insights Dashboard",
        description: "Interactive customer behavior visualization",
        price: 399,
        category: "Analytics",
        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485",
        licenseType: "monthly",
        supportLevel: "basic",
        aiEmbedding: [0.3, 0.2, 0.7],
        ecoScore: 8.2
      }
    ]);
    console.log('Sample products added');
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeSampleData();
});