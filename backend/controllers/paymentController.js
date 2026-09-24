const Payment = require('../models/Payment');
const Case = require('../models/Case');

// @desc    Record a new amount entry / payment
// @route   POST /api/payments
// @access  Public
const addPayment = async (req, res) => {
  try {
    const {
      caseNumber,
      clientName,
      caseType,
      courtName,
      purpose,
      remarks,
      amountReceived,
      date,
      paymentMode,
      enteredBy,
      receiptNumber
    } = req.body;

    if (!caseNumber || amountReceived === undefined || amountReceived === null || amountReceived === '') {
      return res.status(400).json({ success: false, message: 'Case number and amount received are required' });
    }

    const numAmount = Number(amountReceived);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    // Auto-fetch missing details from Case if needed
    let finalClient = clientName;
    let finalCaseType = caseType;
    let finalCourt = courtName;

    const trimmedCaseNo = (caseNumber || '').trim();
    const foundCase = await Case.findOne({
      $or: [
        { caseNumber: trimmedCaseNo },
        { caseNumber: new RegExp(`^${trimmedCaseNo.replace(/\s+/g, '\\s*')}$`, 'i') }
      ]
    });

    if (foundCase) {
      if (!finalClient || finalClient === 'Client') finalClient = foundCase.clientName;
      if (!finalCaseType || finalCaseType === 'General') finalCaseType = foundCase.caseType;
      if (!finalCourt) finalCourt = foundCase.courtName;
    }

    const newPayment = new Payment({
      caseNumber: trimmedCaseNo,
      clientName: finalClient || 'Client',
      caseType: finalCaseType || 'General',
      courtName: finalCourt || '',
      purpose: purpose || 'Professional Fee',
      remarks: remarks || 'Payment received',
      amountReceived: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      paymentMode: paymentMode || 'Cash',
      enteredBy: (enteredBy || 'Junior').trim(),
      receiptNumber: receiptNumber || `RCP-${Date.now().toString().slice(-6)}`
    });

    const savedPayment = await newPayment.save();

    res.status(201).json({
      success: true,
      message: 'Payment entry saved successfully',
      payment: savedPayment
    });
  } catch (error) {
    console.error('Error saving payment entry:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all payment entries with stats, filter, and search
// @route   GET /api/payments
// @access  Public
const getPayments = async (req, res) => {
  try {
    const { caseNumber, enteredBy, paymentMode, q } = req.query;
    const filter = {};

    if (caseNumber) {
      filter.caseNumber = new RegExp(caseNumber.trim(), 'i');
    }
    if (enteredBy && enteredBy.trim() !== 'All') {
      filter.enteredBy = new RegExp(`^${enteredBy.trim()}$`, 'i');
    }
    if (paymentMode && paymentMode.trim() !== 'All') {
      filter.paymentMode = new RegExp(`^${paymentMode.trim()}$`, 'i');
    }
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { caseNumber: searchRegex },
        { clientName: searchRegex },
        { purpose: searchRegex },
        { remarks: searchRegex },
        { enteredBy: searchRegex },
        { courtName: searchRegex },
        { receiptNumber: searchRegex }
      ];
    }

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    const totalAmount = payments.reduce((acc, curr) => acc + (curr.amountReceived || 0), 0);

    // Calculate helpful breakdowns
    const todayStr = new Date().toISOString().split('T')[0];
    const todayFormatted = (() => {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    })();

    const todayAmount = payments
      .filter(p => p.date === todayStr || p.date === todayFormatted || (p.createdAt && new Date(p.createdAt).toISOString().split('T')[0] === todayStr))
      .reduce((acc, curr) => acc + (curr.amountReceived || 0), 0);

    // Breakdown by payment mode
    const modeBreakdown = {};
    payments.forEach(p => {
      const mode = p.paymentMode || 'Cash';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + (p.amountReceived || 0);
    });

    // Breakdown by junior
    const juniorBreakdown = {};
    payments.forEach(p => {
      const junior = p.enteredBy || 'Junior';
      juniorBreakdown[junior] = (juniorBreakdown[junior] || 0) + (p.amountReceived || 0);
    });

    res.json({
      success: true,
      count: payments.length,
      totalAmount,
      todayAmount,
      modeBreakdown,
      juniorBreakdown,
      payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get payment history for a specific case
// @route   GET /api/payments/case/:caseNumber
// @access  Public
const getCasePayments = async (req, res) => {
  try {
    const { caseNumber } = req.params;
    const cleanCase = caseNumber.trim();
    const payments = await Payment.find({
      $or: [
        { caseNumber: cleanCase },
        { caseNumber: new RegExp(`^${cleanCase.replace(/\s+/g, '\\s*')}$`, 'i') }
      ]
    }).sort({ createdAt: 1 });

    const totalReceived = payments.reduce((sum, p) => sum + (p.amountReceived || 0), 0);

    res.json({
      success: true,
      caseNumber,
      totalReceived,
      history: payments
    });
  } catch (error) {
    console.error('Error fetching case payment history:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete a payment record
// @route   DELETE /api/payments/:id
// @access  Public
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    res.json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Clean up duplicate records across database
// @route   POST /api/payments/cleanup-duplicates
// @access  Public
const cleanDuplicates = async (req, res) => {
  try {
    let deletedCount = 0;

    // 1. Remove duplicate payments (same caseNumber, amount, date, purpose, enteredBy)
    const allPayments = await Payment.find({}).sort({ createdAt: 1 });
    const seenP = new Map();
    const duplicatePIds = [];
    for (const p of allPayments) {
      const key = `${p.caseNumber}|${p.amountReceived}|${p.date}|${p.purpose}|${p.enteredBy}`;
      if (seenP.has(key)) {
        duplicatePIds.push(p._id);
      } else {
        seenP.set(key, p._id);
      }
    }
    if (duplicatePIds.length > 0) {
      const pRes = await Payment.deleteMany({ _id: { $in: duplicatePIds } });
      deletedCount += pRes.deletedCount;
    }

    // 2. Remove duplicate cases
    const allCases = await Case.find({}).sort({ createdAt: 1 });
    const seenC = new Map();
    const duplicateCIds = [];
    for (const c of allCases) {
      const key = (c.caseNumber || '').trim().toLowerCase();
      if (!key) continue;
      if (seenC.has(key)) {
        duplicateCIds.push(c._id);
      } else {
        seenC.set(key, c._id);
      }
    }
    if (duplicateCIds.length > 0) {
      const cRes = await Case.deleteMany({ _id: { $in: duplicateCIds } });
      deletedCount += cRes.deletedCount;
    }

    res.json({
      success: true,
      message: `Duplicate cleanup completed. ${deletedCount} duplicate items removed.`,
      duplicatePaymentsRemoved: duplicatePIds.length,
      duplicateCasesRemoved: duplicateCIds.length
    });
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  addPayment,
  getPayments,
  getCasePayments,
  deletePayment,
  cleanDuplicates
};
