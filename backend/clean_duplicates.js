require('dotenv').config();
const mongoose = require('mongoose');

async function cleanAllDuplicates() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/layerdb');
  const db = mongoose.connection.db;

  console.log('--- STARTING COMPREHENSIVE DEDUPLICATION ---');

  // 1. ADMINS: Clean whitespace and remove duplicate admins
  const admins = await db.collection('admins').find({}).toArray();
  const seenAdminUser = new Map();
  for (const a of admins) {
    const cleanUser = (a.username || '').trim().toLowerCase();
    const cleanName = (a.name || a.juniorName || '').trim();
    await db.collection('admins').updateOne(
      { _id: a._id },
      { $set: { username: cleanUser, name: cleanName } }
    );
    if (seenAdminUser.has(cleanUser)) {
      console.log('Deleting duplicate admin:', a._id, cleanUser);
      await db.collection('admins').deleteOne({ _id: a._id });
    } else {
      seenAdminUser.set(cleanUser, a._id);
    }
  }

  // 2. CASES: Normalize caseNumber (e.g., 'CSE -2026-001' -> 'CSE-2026-001') and remove duplicates
  const allCases = await db.collection('cases').find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  const seenCaseNumbers = new Map();
  const duplicateCaseIds = [];

  for (const c of allCases) {
    const rawNo = c.caseNumber || '';
    const normalizedNo = rawNo.replace(/\s+/g, '-').replace(/-+/g, '-').trim().toUpperCase();
    const cleanClient = (c.clientName || '').trim();
    const cleanJunior = (c.assignedJunior || '').trim();

    await db.collection('cases').updateOne(
      { _id: c._id },
      {
        $set: {
          caseNumber: normalizedNo,
          clientName: cleanClient,
          assignedJunior: cleanJunior
        }
      }
    );

    const dedupKey = normalizedNo;
    if (seenCaseNumbers.has(dedupKey)) {
      console.log('Found duplicate case to remove:', c._id, dedupKey);
      duplicateCaseIds.push(c._id);
    } else {
      seenCaseNumbers.set(dedupKey, c._id);
    }
  }

  if (duplicateCaseIds.length > 0) {
    await db.collection('cases').deleteMany({ _id: { $in: duplicateCaseIds } });
    console.log(`Deleted ${duplicateCaseIds.length} duplicate cases.`);
  }

  // 3. JUNIORS: Clean whitespace and deduplicate by username
  const allJuniors = await db.collection('juniors').find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  const seenJuniorUsers = new Map();
  const duplicateJuniorIds = [];

  for (const j of allJuniors) {
    const cleanUser = (j.username || '').trim().toLowerCase();
    const cleanName = (j.juniorName || '').trim();

    await db.collection('juniors').updateOne(
      { _id: j._id },
      {
        $set: {
          username: cleanUser,
          juniorName: cleanName,
          email: (j.email || '').trim(),
          mobileNumber: (j.mobileNumber || '').trim()
        }
      }
    );

    const dedupKey = cleanUser || cleanName.toLowerCase();
    if (seenJuniorUsers.has(dedupKey)) {
      console.log('Found duplicate junior to remove:', j._id, dedupKey);
      duplicateJuniorIds.push(j._id);
    } else {
      seenJuniorUsers.set(dedupKey, j._id);
    }
  }

  if (duplicateJuniorIds.length > 0) {
    await db.collection('juniors').deleteMany({ _id: { $in: duplicateJuniorIds } });
    console.log(`Deleted ${duplicateJuniorIds.length} duplicate juniors.`);
  }

  // 4. PAYMENTS: Normalize caseNumber, clean whitespace, and deduplicate
  const allPayments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();
  const seenPaymentKeys = new Map();
  const duplicatePaymentIds = [];

  for (const p of allPayments) {
    const rawNo = p.caseNumber || '';
    const normalizedNo = rawNo.replace(/\s+/g, '-').replace(/-+/g, '-').trim().toUpperCase();
    const cleanClient = (p.clientName || 'Client').trim();
    const cleanJunior = (p.enteredBy || 'Junior').trim();
    const cleanPurpose = (p.purpose || p.remarks || 'Fee Payment').trim();

    await db.collection('payments').updateOne(
      { _id: p._id },
      {
        $set: {
          caseNumber: normalizedNo,
          clientName: cleanClient,
          enteredBy: cleanJunior,
          purpose: cleanPurpose,
          remarks: (p.remarks || cleanPurpose).trim()
        }
      }
    );

    // If identical case, amount, date, purpose, and collector
    const key = `${normalizedNo}|${p.amountReceived}|${(p.date || '').trim()}|${cleanPurpose.toLowerCase()}|${cleanJunior.toLowerCase()}`;
    if (seenPaymentKeys.has(key)) {
      console.log('Found duplicate payment to remove:', p._id, key);
      duplicatePaymentIds.push(p._id);
    } else {
      seenPaymentKeys.set(key, p._id);
    }
  }

  if (duplicatePaymentIds.length > 0) {
    await db.collection('payments').deleteMany({ _id: { $in: duplicatePaymentIds } });
    console.log(`Deleted ${duplicatePaymentIds.length} duplicate payments.`);
  }

  // 5. Remove any old 100 test payment if newer 5000 payment exists for the same case
  const test100Payments = await db.collection('payments').find({ amountReceived: 100 }).toArray();
  if (test100Payments.length > 0) {
    for (const tp of test100Payments) {
      const otherPayments = await db.collection('payments').countDocuments({
        caseNumber: tp.caseNumber,
        _id: { $ne: tp._id }
      });
      if (otherPayments > 0) {
        console.log('Removing old 100 test payment for case:', tp.caseNumber);
        await db.collection('payments').deleteOne({ _id: tp._id });
      }
    }
  }

  console.log('\n--- FINAL STATUS AFTER CLEANUP ---');
  const finalCases = await db.collection('cases').find({}).toArray();
  console.log(`Cases (${finalCases.length}):`, finalCases.map(c => `${c.caseNumber} (${c.clientName} -> ${c.assignedJunior})`));

  const finalJuniors = await db.collection('juniors').find({}).toArray();
  console.log(`Juniors (${finalJuniors.length}):`, finalJuniors.map(j => `${j.juniorName} (@${j.username})`));

  const finalPayments = await db.collection('payments').find({}).toArray();
  console.log(`Payments (${finalPayments.length}):`, finalPayments.map(p => `${p.caseNumber}: ₹${p.amountReceived} (${p.purpose} by ${p.enteredBy})`));

  await mongoose.disconnect();
}

cleanAllDuplicates().catch(console.error);
