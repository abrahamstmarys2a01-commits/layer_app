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
      trialStartDate: now,
      trialExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 Day Demo
      isFirstLogin: false
    });
    await admin.save();
  } else if (!admin.trialExpiresAt) {
    admin.trialStartDate = admin.trialStartDate || now;
    admin.trialExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Day Demo
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
        const now = new Date();

        // If first login or uninitialized, start 30-day demo countdown from today
        if (admin.isFirstLogin || !admin.trialExpiresAt) {
          admin.trialStartDate = now;
          admin.trialExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          admin.isFirstLogin = false;
          await admin.save();
        }

        // Check if demo period has expired
        const isExpired = now > new Date(admin.trialExpiresAt);
        const msLeft = new Date(admin.trialExpiresAt) - now;
        const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

        if (isExpired) {
          return res.status(403).json({
            success: false,
            isExpired: true,
            message: 'Your 30-day demo period has ended. Please contact support.',
            trialExpiresAt: admin.trialExpiresAt,
            supportPhone: admin.supportPhone || '+91 98765 43210',
            supportWhatsApp: admin.supportWhatsApp || '+919876543210'
          });
        }

        return res.json({
          success: true,
          role: 'admin',
          message: 'Admin login successful',
          isExpired: false,
          daysRemaining,
          trialExpiresAt: admin.trialExpiresAt,
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
    });

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
// @desc    Check demo trial status and days remaining
expressRouter.get('/demo-status', async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    const now = new Date();

    if (!admin.trialExpiresAt) {
      return res.json({
        success: true,
        isExpired: false,
        daysRemaining: 30,
        trialExpiresAt: null,
        supportPhone: admin.supportPhone || '+91 98765 43210',
        supportWhatsApp: admin.supportWhatsApp || '+919876543210'
      });
    }

    const isExpired = now > new Date(admin.trialExpiresAt);
    const msLeft = new Date(admin.trialExpiresAt) - now;
    const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      isExpired,
      daysRemaining,
      trialStartDate: admin.trialStartDate,
      trialExpiresAt: admin.trialExpiresAt,
      supportPhone: admin.supportPhone || '+91 98765 43210',
      supportWhatsApp: admin.supportWhatsApp || '+919876543210'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/reset-demo
// @desc    Reset demo trial for 30 (or custom) days from today
expressRouter.post('/reset-demo', async (req, res) => {
  try {
    const { days = 30 } = req.body || {};
    const admin = await getOrCreateAdmin();
    const now = new Date();

    admin.trialStartDate = now;
    admin.trialExpiresAt = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    admin.isFirstLogin = false;
    await admin.save();

    res.json({
      success: true,
      message: `Demo trial successfully reset! Fresh ${days} day(s) active from now.`,
      isExpired: false,
      daysRemaining: Number(days),
      trialExpiresAt: admin.trialExpiresAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/reset-demo
// @desc    Convenient browser 1-click URL to reset demo from anywhere
expressRouter.get('/reset-demo', async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const admin = await getOrCreateAdmin();
    const now = new Date();

    admin.trialStartDate = now;
    admin.trialExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    admin.isFirstLogin = false;
    await admin.save();

    res.json({
      success: true,
      message: `Demo trial successfully reset! Fresh ${days} day(s) active from now.`,
      isExpired: false,
      daysRemaining: days,
      trialExpiresAt: admin.trialExpiresAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = expressRouter;
