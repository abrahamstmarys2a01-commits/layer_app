const expressRouter = require('express').Router();
const Admin = require('../models/Admin');
const Junior = require('../models/Junior');
const Case = require('../models/Case');

// Helper to get or initialize default admin
const getOrCreateAdmin = async () => {
  let admin = await Admin.findOne();
  const now = new Date();
  if (!admin) {
    admin = new Admin({
      username: 'admin',
      password: 'admin123',
      name: 'Admin',
      phone: '+91 98765 43210',
      email: 'admin@firm.com',
      trialStartDate: null,
      trialExpiresAt: null, // Unlimited - No demo expiry
      isFirstLogin: false
    });
    await admin.save();
  } else if (admin.trialExpiresAt !== null) {
    // Permanently remove demo expiry for existing admin
    admin.trialExpiresAt = null;
    admin.isFirstLogin = false;
    await admin.save();
  }
  return admin;
};

// @route   POST /api/admin/login
// @desc    Unified Login for Admin & Junior
expressRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const trimmedUser = username.trim();
    const admin = await getOrCreateAdmin();

    // 1. Check if Admin
    if (admin.username.toLowerCase() === trimmedUser.toLowerCase()) {
      if (admin.password === password) {
        // App is permanently active with unlimited access (No 30-day demo lock)
        return res.json({
          success: true,
          role: 'admin',
          message: 'Admin login successful',
          isExpired: false,
          isUnlimited: true,
          daysRemaining: 999999,
          trialExpiresAt: null,
          supportPhone: admin.supportPhone || '+91 98765 43210',
          supportWhatsApp: admin.supportWhatsApp || '+919876543210',
          admin: {
            name: admin.name,
            username: admin.username,
            email: admin.email,
            phone: admin.phone,
            photoUrl: admin.photoUrl,
            theme: admin.theme
          }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    // 2. Check if Junior
    const junior = await Junior.findOne({
      $or: [
        { username: trimmedUser },
        { email: trimmedUser.toLowerCase() },
        { juniorName: new RegExp(`^${trimmedUser}$`, 'i') }
      ]
    }).lean();

    if (junior) {
      if (junior.password === password) {
        return res.json({
          success: true,
          role: 'junior',
          message: 'Junior login successful',
          junior: {
            id: junior._id,
            juniorName: junior.juniorName,
            username: junior.username,
            email: junior.email,
            mobileNumber: junior.mobileNumber,
            photoUrl: junior.photoUrl,
            status: junior.status
          }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    return res.status(401).json({ success: false, message: 'User not found. Check username or contact administrator.' });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/profile
// @desc    Get admin profile
expressRouter.get('/profile', async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    res.json(admin);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/admin/profile
// @desc    Update admin profile
expressRouter.post('/profile', async (req, res) => {
  try {
    const { name, phone, email, photoUrl, theme } = req.body;
    let admin = await getOrCreateAdmin();

    if (name !== undefined) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (email !== undefined) admin.email = email;
    if (photoUrl !== undefined) admin.photoUrl = photoUrl;
    if (theme !== undefined) admin.theme = theme;

    const savedAdmin = await admin.save();
    res.status(200).json(savedAdmin);
  } catch (error) {
    console.error('Error saving admin profile:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/admin/change-password
// @desc    Change admin password
expressRouter.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    const admin = await getOrCreateAdmin();

    if (admin.password !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/admin/demo-status
// @desc    Permanent unlimited status (demo restriction removed)
expressRouter.get('/demo-status', async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    res.json({
      success: true,
      isExpired: false,
      isUnlimited: true,
      daysRemaining: 999999,
      trialStartDate: null,
      trialExpiresAt: null,
      supportPhone: admin.supportPhone || '+91 98765 43210',
      supportWhatsApp: admin.supportWhatsApp || '+919876543210'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/reset-demo
// @desc    Permanent activation - ensures no expiry is active
expressRouter.post('/reset-demo', async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    admin.trialExpiresAt = null;
    await admin.save();

    res.json({
      success: true,
      message: 'Demo limit removed. App is permanently active and unlimited.',
      isExpired: false,
      isUnlimited: true,
      daysRemaining: 999999,
      trialExpiresAt: null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/reset-demo
// @desc    Convenient browser URL to ensure permanent activation
expressRouter.get('/reset-demo', async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    admin.trialExpiresAt = null;
    await admin.save();

    res.json({
      success: true,
      message: 'Demo limit removed. App is permanently active and unlimited.',
      isExpired: false,
      isUnlimited: true,
      daysRemaining: 999999,
      trialExpiresAt: null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = expressRouter;
