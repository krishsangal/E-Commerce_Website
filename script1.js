const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


let products = [
    { id: 1, name: 'Wireless Noise-Cancelling Headphones', brand: 'SoundMaster', price: 299, originalPrice: 349, image: 'headphones.jpg', category: 'electronics', tags: ['audio', 'wireless', 'premium'], ecoScore: 4.2 },
    { id: 2, name: 'Ultra HD Smart TV 55"', brand: 'VisionPlus', price: 799, originalPrice: 899, image: 'tv.jpg', category: 'electronics', tags: ['home', 'entertainment'], ecoScore: 3.8 },
    { id: 3, name: 'Ergonomic Office Chair', brand: 'ComfortPro', price: 249, originalPrice: 299, image: 'chair.jpg', category: 'furniture', tags: ['office', 'comfort'], ecoScore: 7.1 },
    { id: 4, name: 'Smartphone Pro Max', brand: 'FruitPhone', price: 1099, originalPrice: 1199, image: 'phone.jpg', category: 'electronics', tags: ['mobile', 'premium'], ecoScore: 5.5 },
    { id: 5, name: 'Bamboo Toothbrush Set', brand: 'EcoLife', price: 12.99, originalPrice: 15.99, image: 'toothbrush.jpg', category: 'personal-care', tags: ['eco', 'sustainable'], ecoScore: 9.8 },
    { id: 6, name: 'Recycled Laptop Backpack', brand: 'GreenGear', price: 59.99, originalPrice: 69.99, image: 'backpack.jpg', category: 'accessories', tags: ['eco', 'travel'], ecoScore: 8.7 },
    { id: 7, name: 'Solar Powered Charger', brand: 'SunPower', price: 39.99, originalPrice: 49.99, image: 'charger.jpg', category: 'electronics', tags: ['eco', 'outdoor'], ecoScore: 9.2 },
    { id: 8, name: 'Organic Cotton T-Shirt', brand: 'PureWear', price: 24.99, originalPrice: 29.99, image: 'tshirt.jpg', category: 'clothing', tags: ['eco', 'fashion'], ecoScore: 8.4 }
];

let users = [
    { id: 1, name: 'AI Shopper', preferences: { style: 'modern', priceRange: [0, 500], ecoPreference: 'high' }, cart: [], wishlist: [] }
];

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

app.get('/api/products/category/:category', (req, res) => {
    const categoryProducts = products.filter(p => p.category === req.params.category);
    res.json(categoryProducts);
});


app.post('/api/classify', (req, res) => {
    const { text, categories } = req.body;
    
    const results = products.map(product => {
        const scores = {};
        categories.forEach(cat => {
           
            const tagMatch = product.tags.some(tag => tag.toLowerCase().includes(cat.toLowerCase())) ? 0.8 : 0.2;
            const nameMatch = product.name.toLowerCase().includes(cat.toLowerCase()) ? 0.9 : 0.1;
            scores[cat] = (tagMatch + nameMatch) / 2;
        });
        return { product: product.name, scores };
    });
    
    res.json({ results });
});


app.get('/api/user/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

app.put('/api/user/:id/preferences', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        user.preferences = req.body;
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


app.get('/api/user/:id/cart', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        res.json(user.cart);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

app.post('/api/user/:id/cart', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        const product = products.find(p => p.id === req.body.productId);
        if (product) {
            const existingItem = user.cart.find(item => item.productId === req.body.productId);
            if (existingItem) {
                existingItem.quantity += req.body.quantity || 1;
            } else {
                user.cart.push({ productId: product.id, quantity: req.body.quantity || 1 });
            }
            res.json(user.cart);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


app.get('/api/user/:id/recommendations', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        
        const { style, priceRange, ecoPreference } = user.preferences;
        
        let recommended = [...products];
        
       
        recommended = recommended.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
        
      
        if (ecoPreference === 'high') {
            recommended = recommended.filter(p => p.ecoScore >= 8);
        } else if (ecoPreference === 'medium') {
            recommended = recommended.filter(p => p.ecoScore >= 5);
        }
        
        recommended.sort((a, b) => b.ecoScore - a.ecoScore);
        
        res.json(recommended.slice(0, 8)); 
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


app.post('/api/assistant', (req, res) => {
    const { message } = req.body;
    
    
    let response = "I can help you with product recommendations, comparisons, and finding the best deals.";
    
    if (message.toLowerCase().includes('trending')) {
        response = "Here are some trending products right now: Wireless earbuds, Smart watches, Portable projectors, Robot vacuums";
    } else if (message.toLowerCase().includes('sustainable') || message.toLowerCase().includes('eco')) {
        response = "I found these sustainable products for you: Bamboo toothbrushes, Recycled backpacks, Solar chargers, Organic cotton clothing";
    } else if (message.toLowerCase().includes('budget')) {
        response = "Based on your preferences, I recommend these products in your budget: Wireless headphones ($299), Smart speaker ($199), Fitness tracker ($129)";
    }
    
    res.json({ response });
});


if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});