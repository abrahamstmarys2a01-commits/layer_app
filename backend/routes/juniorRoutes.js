const expressRouter = require('express').Router();
const {
  addJunior,
  getJuniors,
  loginJunior,
  getJuniorAssignedCases,
  getJuniorProfile,
  updateJuniorProfile
} = require('../controllers/juniorController');

// @route   POST /api/juniors
// @desc    Add a new junior
expressRouter.post('/', addJunior);

// @route   GET /api/juniors
// @desc    Get all juniors
expressRouter.get('/', getJuniors);

// @route   POST /api/juniors/login
// @desc    Junior login
expressRouter.post('/login', loginJunior);

// @route   GET /api/juniors/assigned-cases
// @desc    Get cases assigned to a junior
expressRouter.get('/assigned-cases', getJuniorAssignedCases);

// @route   GET /api/juniors/profile/:identifier
// @desc    Get junior profile
expressRouter.get('/profile/:identifier', getJuniorProfile);

// @route   PUT /api/juniors/profile/:identifier
// @desc    Update junior profile
expressRouter.put('/profile/:identifier', updateJuniorProfile);

module.exports = expressRouter;
