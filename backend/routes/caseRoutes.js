const expressRouter = require('express').Router();
const {
  addCase,
  getCases,
  getCaseById,
  addHearingToCase,
  requestCaseClosure,
  closeCase,
  getPendingClosures,
  updateCase
} = require('../controllers/caseController');

// @route   POST /api/cases
// @desc    Register a new case
expressRouter.post('/', addCase);

// @route   GET /api/cases
// @desc    Get all cases
expressRouter.get('/', getCases);

// @route   GET /api/cases/pending-closures
// @desc    Get cases with pending closure requests
expressRouter.get('/pending-closures', getPendingClosures);

// @route   GET /api/cases/:id
// @desc    Get single case by ID or Case Number
expressRouter.get('/:id', getCaseById);

// @route   POST /api/cases/:id/hearings
// @desc    Add hearing history entry to a case
expressRouter.post('/:id/hearings', addHearingToCase);

// @route   POST /api/cases/:id/request-closure
// @desc    Junior requests case closure
expressRouter.post('/:id/request-closure', requestCaseClosure);

// @route   POST /api/cases/:id/close
// @desc    Admin closes case with closure date, reason and final remarks
expressRouter.post('/:id/close', closeCase);

// @route   PUT /api/cases/:id
// @desc    Update a case
expressRouter.put('/:id', updateCase);

module.exports = expressRouter;
