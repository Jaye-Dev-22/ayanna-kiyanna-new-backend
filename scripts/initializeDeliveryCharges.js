const mongoose = require('mongoose');
const { DeliveryCharge, sriLankanDistricts } = require('../models/DeliveryCharge');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ayannakiyanna:ayannakiyanna123@cluster0.mongodb.net/ayanna-kiyanna?retryWrites=true&w=majority';

// Default delivery charge (Rs. 200)
const DEFAULT_CHARGE = 200;

async function initializeDeliveryCharges() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if delivery charges already exist
    const existingCharges = await DeliveryCharge.countDocuments();
    
    if (existingCharges > 0) {
      console.log(`${existingCharges} delivery charges already exist. Skipping initialization.`);
      return;
    }

    console.log('Initializing delivery charges for all Sri Lankan districts...');

    // Create delivery charges for all districts
    const deliveryCharges = sriLankanDistricts.map(district => ({
      district,
      charge: DEFAULT_CHARGE,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(), // Placeholder admin ID
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all delivery charges
    await DeliveryCharge.insertMany(deliveryCharges);

    console.log(`Successfully initialized delivery charges for ${sriLankanDistricts.length} districts`);
    console.log('Default charge: Rs.', DEFAULT_CHARGE);
    
    // Display all created charges
    console.log('\nCreated delivery charges:');
    sriLankanDistricts.forEach((district, index) => {
      console.log(`${index + 1}. ${district} - Rs. ${DEFAULT_CHARGE}`);
    });

  } catch (error) {
    console.error('Error initializing delivery charges:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the initialization
if (require.main === module) {
  initializeDeliveryCharges();
}

module.exports = initializeDeliveryCharges;
