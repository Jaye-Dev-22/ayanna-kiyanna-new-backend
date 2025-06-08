const { DeliveryCharge, sriLankanDistricts } = require('../models/DeliveryCharge');
const { validationResult } = require('express-validator');

// Get all delivery charges
exports.getAllDeliveryCharges = async (req, res) => {
  try {
    const deliveryCharges = await DeliveryCharge.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ district: 1 });

    res.json(deliveryCharges);
  } catch (err) {
    console.error('Error fetching delivery charges:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get delivery charge by district
exports.getDeliveryChargeByDistrict = async (req, res) => {
  try {
    const { district } = req.params;

    const deliveryCharge = await DeliveryCharge.findOne({ 
      district: district,
      isActive: true 
    });

    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge not found for this district' });
    }

    res.json(deliveryCharge);
  } catch (err) {
    console.error('Error fetching delivery charge:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update delivery charge (Admin only)
exports.createOrUpdateDeliveryCharge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { district, charge } = req.body;

    // Validate district
    if (!sriLankanDistricts.includes(district)) {
      return res.status(400).json({ message: 'Invalid district name' });
    }

    // Check if delivery charge already exists for this district
    let deliveryCharge = await DeliveryCharge.findOne({ district });

    if (deliveryCharge) {
      // Update existing delivery charge
      deliveryCharge.charge = parseFloat(charge);
      deliveryCharge.isActive = true;
      await deliveryCharge.save();
    } else {
      // Create new delivery charge
      deliveryCharge = new DeliveryCharge({
        district,
        charge: parseFloat(charge),
        createdBy: req.user.id
      });
      await deliveryCharge.save();
    }

    // Populate creator information before sending response
    await deliveryCharge.populate('createdBy', 'fullName email');

    res.json(deliveryCharge);
  } catch (err) {
    console.error('Error creating/updating delivery charge:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update delivery charge (Admin only)
exports.updateDeliveryCharge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { charge, isActive } = req.body;

    let deliveryCharge = await DeliveryCharge.findById(req.params.id);

    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge not found' });
    }

    // Update fields
    if (charge !== undefined) {
      deliveryCharge.charge = parseFloat(charge);
    }
    if (isActive !== undefined) {
      deliveryCharge.isActive = isActive;
    }

    await deliveryCharge.save();

    // Populate creator information before sending response
    await deliveryCharge.populate('createdBy', 'fullName email');

    res.json(deliveryCharge);
  } catch (err) {
    console.error('Error updating delivery charge:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Delivery charge not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete delivery charge (Admin only)
exports.deleteDeliveryCharge = async (req, res) => {
  try {
    const deliveryCharge = await DeliveryCharge.findById(req.params.id);

    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge not found' });
    }

    await DeliveryCharge.findByIdAndDelete(req.params.id);

    res.json({ message: 'Delivery charge deleted successfully' });
  } catch (err) {
    console.error('Error deleting delivery charge:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Delivery charge not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all Sri Lankan districts
exports.getDistricts = async (req, res) => {
  try {
    res.json(sriLankanDistricts);
  } catch (err) {
    console.error('Error fetching districts:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Initialize default delivery charges (Admin only)
exports.initializeDeliveryCharges = async (req, res) => {
  try {
    const defaultCharge = 200; // Default delivery charge

    const promises = sriLankanDistricts.map(async (district) => {
      const existingCharge = await DeliveryCharge.findOne({ district });
      
      if (!existingCharge) {
        const deliveryCharge = new DeliveryCharge({
          district,
          charge: defaultCharge,
          createdBy: req.user.id
        });
        return deliveryCharge.save();
      }
      return existingCharge;
    });

    await Promise.all(promises);

    const allCharges = await DeliveryCharge.find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .sort({ district: 1 });

    res.json({
      message: 'Delivery charges initialized successfully',
      deliveryCharges: allCharges
    });
  } catch (err) {
    console.error('Error initializing delivery charges:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
