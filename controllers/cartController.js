const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name category images price discount availableQuantity isActive'
      });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    // Filter out inactive products and products with insufficient stock
    cart.items = cart.items.filter(item => {
      return item.product && item.product.isActive && item.product.availableQuantity > 0;
    });

    // Save cart if items were filtered out
    if (cart.isModified()) {
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity = 1 } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ message: 'Product is not available' });
    }

    if (product.availableQuantity < quantity) {
      return res.status(400).json({ 
        message: `Only ${product.availableQuantity} items available in stock` 
      });
    }

    // Get or create user's cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.availableQuantity) {
        return res.status(400).json({ 
          message: `Cannot add more items. Only ${product.availableQuantity} items available in stock` 
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        priceAtTime: product.price,
        discountAtTime: product.discount || 0
      });
    }

    await cart.save();

    // Populate product details before sending response
    await cart.populate({
      path: 'items.product',
      select: 'name category images price discount availableQuantity isActive'
    });

    res.json(cart);
  } catch (err) {
    console.error('Error adding to cart:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ message: 'Product is not available' });
    }

    if (product.availableQuantity < quantity) {
      return res.status(400).json({ 
        message: `Only ${product.availableQuantity} items available in stock` 
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find and update the item
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate product details before sending response
    await cart.populate({
      path: 'items.product',
      select: 'name category images price discount availableQuantity isActive'
    });

    res.json(cart);
  } catch (err) {
    console.error('Error updating cart item:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove the item
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    // Populate product details before sending response
    await cart.populate({
      path: 'items.product',
      select: 'name category images price discount availableQuantity isActive'
    });

    res.json(cart);
  } catch (err) {
    console.error('Error removing from cart:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (err) {
    console.error('Error clearing cart:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get cart item count
exports.getCartItemCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.json({ count: 0 });
    }

    const count = cart.items.reduce((total, item) => total + item.quantity, 0);
    res.json({ count });
  } catch (err) {
    console.error('Error fetching cart count:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
