const Order = require('../models/Order');
const Product = require('../models/Product');

// Get product sales analytics
const getProductAnalytics = async (req, res) => {
  try {
    // Get all approved orders
    const approvedOrders = await Order.find({ status: 'approved' })
      .populate('items.product', 'name category price images')
      .sort({ createdAt: -1 });

    // Calculate analytics for each product
    const productAnalytics = {};
    let totalIncome = 0;

    // Process each order
    approvedOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product._id.toString();
        const productName = item.product.name;
        const productCategory = item.product.category;
        const productImage = item.product.images[0]?.url || '';
        const quantitySold = item.quantity;
        const priceAtTime = item.priceAtTime;
        const itemTotal = item.itemTotal;

        if (!productAnalytics[productId]) {
          productAnalytics[productId] = {
            productId,
            productName,
            productCategory,
            productImage,
            quantitySold: 0,
            totalIncome: 0,
            averagePrice: 0,
            orders: []
          };
        }

        productAnalytics[productId].quantitySold += quantitySold;
        productAnalytics[productId].totalIncome += itemTotal;
        productAnalytics[productId].orders.push({
          orderId: order.orderId,
          orderDate: order.createdAt,
          quantity: quantitySold,
          priceAtTime,
          itemTotal
        });

        totalIncome += itemTotal;
      });
    });

    // Calculate average prices and convert to array
    const analyticsArray = Object.values(productAnalytics).map(product => ({
      ...product,
      averagePrice: product.totalIncome / product.quantitySold,
      orderCount: product.orders.length
    }));

    // Sort by total income (highest first)
    analyticsArray.sort((a, b) => b.totalIncome - a.totalIncome);

    // Get top performing products
    const topProducts = analyticsArray.slice(0, 10);

    // Get category-wise analytics
    const categoryAnalytics = {};
    analyticsArray.forEach(product => {
      const category = product.productCategory;
      if (!categoryAnalytics[category]) {
        categoryAnalytics[category] = {
          category,
          totalProducts: 0,
          totalQuantitySold: 0,
          totalIncome: 0
        };
      }
      categoryAnalytics[category].totalProducts += 1;
      categoryAnalytics[category].totalQuantitySold += product.quantitySold;
      categoryAnalytics[category].totalIncome += product.totalIncome;
    });

    const categoryArray = Object.values(categoryAnalytics);

    // Get monthly sales data (last 12 months)
    const monthlyData = {};
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        totalOrders: 0,
        totalIncome: 0,
        totalQuantity: 0
      };
    }

    // Fill monthly data
    approvedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].totalOrders += 1;
        monthlyData[monthKey].totalIncome += order.totalAmount;
        monthlyData[monthKey].totalQuantity += order.items.reduce((sum, item) => sum + item.quantity, 0);
      }
    });

    const monthlyArray = Object.values(monthlyData);

    // Get overall statistics
    const totalOrders = approvedOrders.length;
    const totalProductsSold = analyticsArray.reduce((sum, product) => sum + product.quantitySold, 0);
    const averageOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0;

    res.json({
      overview: {
        totalIncome,
        totalOrders,
        totalProductsSold,
        averageOrderValue,
        totalUniqueProducts: analyticsArray.length
      },
      productAnalytics: analyticsArray,
      topProducts,
      categoryAnalytics: categoryArray,
      monthlyData: monthlyArray,
      recentOrders: approvedOrders.slice(0, 10).map(order => ({
        orderId: order.orderId,
        orderDate: order.createdAt,
        customerEmail: order.userEmail,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        status: order.status
      }))
    });

  } catch (error) {
    console.error('Error getting product analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get inventory status
const getInventoryStatus = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ availableQuantity: 1 }); // Sort by quantity (lowest first)

    // Categorize products by stock level
    const lowStock = products.filter(product => product.availableQuantity <= 5 && product.availableQuantity > 0);
    const outOfStock = products.filter(product => product.availableQuantity === 0);
    const inStock = products.filter(product => product.availableQuantity > 5);

    // Calculate total inventory value
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + (product.availableQuantity * product.price);
    }, 0);

    // Get category-wise inventory
    const categoryInventory = {};
    products.forEach(product => {
      const category = product.category;
      if (!categoryInventory[category]) {
        categoryInventory[category] = {
          category,
          totalProducts: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }
      categoryInventory[category].totalProducts += 1;
      categoryInventory[category].totalQuantity += product.availableQuantity;
      categoryInventory[category].totalValue += (product.availableQuantity * product.price);
    });

    res.json({
      overview: {
        totalProducts: products.length,
        totalInventoryValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        inStockCount: inStock.length
      },
      lowStock,
      outOfStock,
      inStock,
      categoryInventory: Object.values(categoryInventory),
      allProducts: products
    });

  } catch (error) {
    console.error('Error getting inventory status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProductAnalytics,
  getInventoryStatus
};
