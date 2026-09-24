const Junior = require('../models/Junior');
const Case = require('../models/Case');

// @desc    Add a new junior
// @route   POST /api/juniors
// @access  Public
const addJunior = async (req, res) => {
  try {
    const newJunior = new Junior(req.body);
    const savedJunior = await newJunior.save();
    res.status(201).json(savedJunior);
  } catch (error) {
    console.error('Error saving junior:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all juniors
// @route   GET /api/juniors
// @access  Public
const getJuniors = async (req, res) => {
  try {
    const juniors = await Junior.find().sort({ createdAt: -1 });
    res.json(juniors);
  } catch (error) {
    console.error('Error fetching juniors:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Junior login
// @route   POST /api/juniors/login
// @access  Public
const loginJunior = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const trimmedUser = username.trim();
    const junior = await Junior.findOne({
      $or: [
        { username: trimmedUser },
        { email: trimmedUser.toLowerCase() },
        { juniorName: new RegExp(`^${trimmedUser}$`, 'i') }
      ]
    });

    if (!junior) {
      return res.status(401).json({ success: false, message: 'Junior account not found' });
    }

    if (junior.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    res.json({
      success: true,
      role: 'junior',
      junior: {
        id: junior._id,
        juniorName: junior.juniorName,
        username: junior.username,
        email: junior.email,
        mobileNumber: junior.mobileNumber,
        joiningDate: junior.joiningDate,
        status: junior.status,
        photoUrl: junior.photoUrl
      }
    });
  } catch (error) {
    console.error('Error in junior login:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get cases assigned to a junior with stats
// @route   GET /api/juniors/assigned-cases
// @access  Public
const getJuniorAssignedCases = async (req, res) => {
  try {
    const { juniorName, username } = req.query;
    const queryName = juniorName || username;

    if (!queryName) {
      return res.status(400).json({ success: false, message: 'Junior name or username is required' });
    }

    const regex = new RegExp(queryName.trim(), 'i');
    const cases = await Case.find({ assignedJunior: { $regex: regex } }).sort({ createdAt: -1 });

    const activeCases = cases.filter(c => !c.status || c.status.toLowerCase() === 'active').length;
    const closedCases = cases.filter(c => c.status && (c.status.toLowerCase() === 'closed' || c.status.toLowerCase() === 'disposed' || c.status.toLowerCase() === 'completed')).length;
    const upcomingHearings = cases.filter(c => (!c.status || c.status.toLowerCase() === 'active') && c.nextHearing && c.nextHearing.trim() !== '' && c.nextHearing.trim() !== '-').length;

    res.json({
      success: true,
      juniorName: queryName,
      cases,
      stats: {
        activeCases,
        upcomingHearings,
        closedCases,
        totalCases: cases.length
      }
    });
  } catch (error) {
    console.error('Error fetching junior assigned cases:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get junior profile by username, id, or juniorName
// @route   GET /api/juniors/profile/:identifier
// @access  Public
const getJuniorProfile = async (req, res) => {
  try {
    const { identifier } = req.params;
    const trimmed = identifier.trim();

    let query = {
      $or: [
        { username: trimmed },
        { email: trimmed.toLowerCase() },
        { juniorName: new RegExp(`^${trimmed}$`, 'i') }
      ]
    };

    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      query.$or.unshift({ _id: trimmed });
    }

    const junior = await Junior.findOne(query);
    if (!junior) {
      return res.status(404).json({ success: false, message: 'Junior profile not found' });
    }

    res.json({
      success: true,
      junior: {
        id: junior._id,
        juniorName: junior.juniorName,
        username: junior.username,
        email: junior.email,
        mobileNumber: junior.mobileNumber,
        joiningDate: junior.joiningDate,
        status: junior.status,
        photoUrl: junior.photoUrl
      }
    });
  } catch (error) {
    console.error('Error getting junior profile:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update junior profile details
// @route   PUT /api/juniors/profile/:identifier
// @access  Public
const updateJuniorProfile = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { juniorName, email, mobileNumber, password, photoUrl } = req.body;
    const trimmed = identifier.trim();

    let query = {
      $or: [
        { username: trimmed },
        { email: trimmed.toLowerCase() },
        { juniorName: new RegExp(`^${trimmed}$`, 'i') }
      ]
    };

    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      query.$or.unshift({ _id: trimmed });
    }

    const junior = await Junior.findOne(query);
    if (!junior) {
      return res.status(404).json({ success: false, message: 'Junior not found' });
    }

    const oldName = junior.juniorName;

    if (juniorName && juniorName.trim()) junior.juniorName = juniorName.trim();
    if (email && email.trim()) junior.email = email.trim();
    if (mobileNumber && mobileNumber.trim()) junior.mobileNumber = mobileNumber.trim();
    if (photoUrl !== undefined) junior.photoUrl = photoUrl;
    if (password && password.trim()) junior.password = password.trim();

    const saved = await junior.save();

    // If junior name changed, optionally sync assigned cases
    if (juniorName && oldName && juniorName.trim() !== oldName) {
      try {
        await Case.updateMany(
          { assignedJunior: new RegExp(`^${oldName}$`, 'i') },
          { $set: { assignedJunior: juniorName.trim() } }
        );
      } catch (err) {}
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      junior: {
        id: saved._id,
        juniorName: saved.juniorName,
        username: saved.username,
        email: saved.email,
        mobileNumber: saved.mobileNumber,
        joiningDate: saved.joiningDate,
        status: saved.status,
        photoUrl: saved.photoUrl
      }
    });
  } catch (error) {
    console.error('Error updating junior profile:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  addJunior,
  getJuniors,
  loginJunior,
  getJuniorAssignedCases,
  getJuniorProfile,
  updateJuniorProfile
};
