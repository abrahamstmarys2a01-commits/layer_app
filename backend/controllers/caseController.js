const Case = require('../models/Case');

// Helper to find a case by ID or flexible Case Number match
const findCaseFlexible = async (idOrNumber) => {
  if (!idOrNumber) return null;
  const raw = decodeURIComponent(idOrNumber).trim();

  // 1. Try ObjectId match
  if (raw.match(/^[0-9a-fA-F]{24}$/)) {
    const byId = await Case.findById(raw);
    if (byId) return byId;
  }

  // 2. Exact caseNumber match
  const byExact = await Case.findOne({ caseNumber: raw });
  if (byExact) return byExact;

  // 3. Flexible normalized match (ignoring extra spaces and case)
  const normalized = raw.replace(/\s+/g, '\\s*');
  const byRegex = await Case.findOne({ caseNumber: { $regex: new RegExp(`^${normalized}$`, 'i') } });
  if (byRegex) return byRegex;

  return null;
};

// @desc    Register a new case
// @route   POST /api/cases
// @access  Public
const addCase = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.assignedDate) {
      data.assignedDate = data.filedDate || new Date().toISOString().split('T')[0];
    }
    const newCase = new Case(data);
    const savedCase = await newCase.save();
    res.status(201).json(savedCase);
  } catch (error) {
    console.error('Error saving case:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all cases
// @route   GET /api/cases
// @access  Public
const getCases = async (req, res) => {
  try {
    const cases = await Case.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single case by ID or Case Number
// @route   GET /api/cases/:id
// @access  Public
const getCaseById = async (req, res) => {
  try {
    const foundCase = await findCaseFlexible(req.params.id);
    if (!foundCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    res.json({ success: true, case: foundCase });
  } catch (error) {
    console.error('Error fetching case by ID:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Add a hearing entry to a case (preserving previous history)
// @route   POST /api/cases/:id/hearings
// @access  Public
const addHearingToCase = async (req, res) => {
  try {
    const { hearingDate, hearingNotes, nextHearingDate, stage, addedBy } = req.body;

    if (!hearingDate || !hearingNotes) {
      return res.status(400).json({ success: false, message: 'Hearing Date and Hearing Notes are required' });
    }

    const targetCase = await findCaseFlexible(req.params.id);
    if (!targetCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const newHearingEntry = {
      hearingDate: hearingDate.trim(),
      hearingNotes: hearingNotes.trim(),
      nextHearingDate: (nextHearingDate || '-').trim(),
      stage: (stage || 'Hearing completed').trim(),
      addedBy: (addedBy || 'Junior').trim(),
      createdAt: new Date()
    };

    if (!Array.isArray(targetCase.hearingsHistory)) {
      targetCase.hearingsHistory = [];
    }

    targetCase.hearingsHistory.push(newHearingEntry);

    // Update case's current nextHearing date if provided
    if (nextHearingDate && nextHearingDate !== '-') {
      targetCase.nextHearing = nextHearingDate.trim();
    }

    await targetCase.save();

    res.status(201).json({
      success: true,
      message: 'Hearing entry recorded in history successfully',
      case: targetCase,
      hearing: newHearingEntry
    });
  } catch (error) {
    console.error('Error adding hearing entry:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Junior requests case closure
// @route   POST /api/cases/:id/request-closure
// @access  Public
const requestCaseClosure = async (req, res) => {
  try {
    const { reason, requestedBy } = req.body;
    const targetCase = await findCaseFlexible(req.params.id);
    if (!targetCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    targetCase.closureRequest = {
      requested: true,
      requestedDate: formattedDate,
      requestedBy: (requestedBy || 'Junior').trim(),
      reason: reason ? reason.trim() : 'Proceedings completed, requesting case closure',
      status: 'Pending'
    };

    targetCase.status = 'Closure Requested';
    await targetCase.save();

    res.json({
      success: true,
      message: 'Case closure request submitted to Admin successfully',
      case: targetCase
    });
  } catch (error) {
    console.error('Error requesting case closure:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Admin verifies and closes case
// @route   POST /api/cases/:id/close
// @access  Public
const closeCase = async (req, res) => {
  try {
    const { closureDate, closureReason, finalRemarks, closedBy } = req.body;
    const targetCase = await findCaseFlexible(req.params.id);
    if (!targetCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const today = new Date();
    const formattedDate = closureDate || `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    targetCase.status = 'Closed';
    targetCase.closureDetails = {
      closureDate: formattedDate,
      closureReason: closureReason ? closureReason.trim() : 'Final Judgement / Settlement Reached',
      finalRemarks: finalRemarks ? finalRemarks.trim() : 'Case disposed and closed by Chamber Admin',
      closedBy: (closedBy || 'Admin').trim()
    };

    if (targetCase.closureRequest) {
      targetCase.closureRequest.status = 'Approved';
    }

    // Append a final closing hearing history entry
    if (!Array.isArray(targetCase.hearingsHistory)) {
      targetCase.hearingsHistory = [];
    }
    targetCase.hearingsHistory.push({
      hearingDate: formattedDate,
      hearingNotes: `Case Closed: ${targetCase.closureDetails.closureReason}. Remarks: ${targetCase.closureDetails.finalRemarks}`,
      nextHearingDate: '-',
      stage: 'Case Closed',
      addedBy: closedBy || 'Admin',
      createdAt: new Date()
    });

    await targetCase.save();

    res.json({
      success: true,
      message: 'Case closed and moved to Closed Cases section successfully',
      case: targetCase
    });
  } catch (error) {
    console.error('Error closing case:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all cases with pending closure requests
// @route   GET /api/cases/pending-closures
// @access  Public
const getPendingClosures = async (req, res) => {
  try {
    const cases = await Case.find({
      $or: [
        { 'closureRequest.status': 'Pending' },
        { status: 'Closure Requested' }
      ]
    }).sort({ updatedAt: -1 });

    res.json({ success: true, count: cases.length, cases });
  } catch (error) {
    console.error('Error fetching pending closures:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a case or its documents
// @route   PUT /api/cases/:id
// @access  Public
const updateCase = async (req, res) => {
  try {
    const targetCase = await findCaseFlexible(req.params.id);
    if (!targetCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    Object.assign(targetCase, req.body);
    const saved = await targetCase.save();
    res.json(saved);
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  addCase,
  getCases,
  getCaseById,
  addHearingToCase,
  requestCaseClosure,
  closeCase,
  getPendingClosures,
  updateCase
};
