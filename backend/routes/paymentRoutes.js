const expressRouter = require('express').Router();
const {
  addPayment,
  getPayments,
  getCasePayments,
  deletePayment,
  cleanDuplicates
} = require('../controllers/paymentController');

// @route   POST /api/payments
// @desc    Record new payment entry
expressRouter.post('/', addPayment);

// @route   GET /api/payments
// @desc    Get all payments
expressRouter.get('/', getPayments);

// @route   GET /api/payments/case/:caseNumber
// @desc    Get case payment history
expressRouter.get('/case/:caseNumber', getCasePayments);

// @route   DELETE /api/payments/:id
// @desc    Delete payment entry
expressRouter.delete('/:id', deletePayment);

// @route   POST /api/payments/cleanup-duplicates
// @desc    Cleanup duplicates
expressRouter.post('/cleanup-duplicates', cleanDuplicates);

module.exports = expressRouter;

