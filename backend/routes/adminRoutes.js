const expressRouter = require('express').Router();
const Admin = require('../models/Admin');
const Junior = require('../models/Junior');
const Case = require('../models/Case');

// Helper to get or initialize default admin
const getOrCreateAdmin = async () => {
  let admin = await Admin.findOne();
  if (!admin) {
    admin = new Admin({
      username: 'admin',
      password: 'admin123',
      name: 'Senior Advocate',
      phone: '+91 98765 43210',
      email: 'admin@firm.com'
    });
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
        return res.json({
          success: true,
          role: 'admin',
          message: 'Admin login successful',
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

module.exports = expressRouter;
