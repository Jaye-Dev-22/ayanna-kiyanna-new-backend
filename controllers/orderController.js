const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { DeliveryCharge } = require('../models/DeliveryCharge');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dl9k5qoae',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      deliveryType,
      deliveryInfo,
      paymentMethod,
      paymentReceipts,
      paidInPerson = false,
      adminPaymentInfo
    } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate stock availability
    for (const item of cart.items) {
      if (!item.product.isActive) {
        return res.status(400).json({ 
          message: `Product ${item.product.name} is no longer available` 
        });
      }
      if (item.product.availableQuantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${item.product.name}. Only ${item.product.availableQuantity} available` 
        });
      }
    }

    // Calculate order totals
    let subtotal = 0;
    let totalDiscount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const itemSubtotal = item.priceAtTime * item.quantity;
      const itemDiscount = (item.priceAtTime * item.discountAtTime / 100) * item.quantity;
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      orderItems.push({
        product: item.product._id,
        productName: item.product.name,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        discountAtTime: item.discountAtTime,
        itemTotal
      });
    }

    // Calculate delivery charge
    let deliveryCharge = 0;
    if (deliveryType === 'delivery' && deliveryInfo.district) {
      const deliveryChargeDoc = await DeliveryCharge.findOne({ 
        district: deliveryInfo.district,
        isActive: true 
      });
      if (deliveryChargeDoc) {
        deliveryCharge = deliveryChargeDoc.charge;
      }
    }

    const totalAmount = subtotal - totalDiscount + deliveryCharge;

    // Validate payment receipts if required
    if (paymentMethod === 'bank_transfer' && !paidInPerson) {
      if (!paymentReceipts || paymentReceipts.length === 0) {
        return res.status(400).json({ message: 'Payment receipt is required for bank transfer' });
      }
      if (paymentReceipts.length > 3) {
        return res.status(400).json({ message: 'Maximum 3 payment receipts allowed' });
      }
    }

    // Additional validation for delivery info when delivery type is delivery
    if (deliveryType === 'delivery') {
      if (!deliveryInfo || !deliveryInfo.recipientName || !deliveryInfo.contactNumber ||
          !deliveryInfo.address || !deliveryInfo.district) {
        return res.status(400).json({ message: 'Complete delivery information is required for delivery orders' });
      }
    }

    // Validate admin payment info when paid in person
    if (paidInPerson) {
      if (!adminPaymentInfo || !adminPaymentInfo.recipientName || !adminPaymentInfo.contactNumber) {
        return res.status(400).json({ message: 'Recipient name and contact number are required for admin cash payments' });
      }
    }

    // Get user details to ensure we have the email
    const User = require('../models/User');
    const userDetails = await User.findById(req.user.id);

    if (!userDetails) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Creating order for user:', userDetails.email);
    console.log('Order data:', {
      user: req.user.id,
      userEmail: userDetails.email,
      deliveryType,
      paymentMethod,
      paidInPerson,
      totalAmount
    });

    // Create order
    const order = new Order({
      user: req.user.id,
      userEmail: userDetails.email,
      items: orderItems,
      subtotal,
      totalDiscount,
      deliveryCharge,
      totalAmount,
      deliveryType,
      deliveryInfo: deliveryType === 'delivery' ? deliveryInfo : undefined,
      paymentMethod,
      paymentReceipts: paymentReceipts || [],
      paidInPerson,
      adminPaymentInfo: paidInPerson ? adminPaymentInfo : undefined,
      status: paidInPerson ? 'approved' : 'pending'
    });

    await order.save();
    console.log('Order saved successfully with ID:', order.orderId);

    // Only deduct inventory if order is automatically approved (admin paid in person)
    if (order.status === 'approved') {
      console.log('Order auto-approved, deducting inventory...');
      for (const item of cart.items) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { availableQuantity: -item.quantity } }
        );
      }
    } else {
      console.log('Order pending approval, inventory not deducted yet');
    }

    // Clear user's cart
    cart.items = [];
    await cart.save();

    // Populate order details before sending response
    await order.populate('items.product', 'name category images');

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);

    // If it's a validation error, send detailed error info
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Order validation failed',
        errors: validationErrors,
        details: err.errors
      });
    }

    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('items.product', 'name category images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Error fetching user orders:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name category images')
      .populate('user', 'fullName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all orders (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      deliveryType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (deliveryType && deliveryType !== 'all') {
      filter.deliveryType = deliveryType;
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(filter)
      .populate('items.product', 'name category images')
      .populate('user', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Get pending orders count
    const pendingCount = await Order.countDocuments({ status: 'pending' });

    res.json({
      orders,
      pendingCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Error fetching all orders:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, adminNote, deliveryStatus } = req.body;

    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.status;
    console.log(`Updating order ${order.orderId} from ${previousStatus} to ${status}`);

    // Handle inventory management based on status changes
    if (status !== undefined && status !== previousStatus) {

      // Case 1: Order being approved (pending/rejected → approved)
      if (status === 'approved' && previousStatus !== 'approved') {
        console.log('Order approved, deducting inventory...');

        // Check if all products have sufficient stock
        for (const item of order.items) {
          const product = item.product;
          if (product.availableQuantity < item.quantity) {
            return res.status(400).json({
              message: `Insufficient stock for ${product.name}. Available: ${product.availableQuantity}, Required: ${item.quantity}`
            });
          }
        }

        // Deduct inventory
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { availableQuantity: -item.quantity } }
          );
        }
      }

      // Case 2: Order being rejected/cancelled (approved → rejected)
      else if ((status === 'rejected' || status === 'cancelled') && previousStatus === 'approved') {
        console.log('Order rejected/cancelled, restoring inventory...');

        // Restore inventory
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { availableQuantity: item.quantity } }
          );
        }
      }
    }

    // Update order status
    if (status !== undefined) {
      order.status = status;
    }

    if (adminNote !== undefined) {
      order.adminNote = adminNote;
    }

    if (deliveryStatus !== undefined) {
      order.deliveryStatus = deliveryStatus;
    }

    await order.save();

    // Populate order details before sending response
    await order.populate('items.product', 'name category images');
    await order.populate('user', 'fullName email');

    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
