const mongoose = require('mongoose');
const Case = require('./models/Case');

mongoose.connect('mongodb://127.0.0.1:27017/layerdb').then(async () => {
  const cases = await Case.find();
  console.log('All cases:');
  for (const c of cases) {
    console.log(`_id: ${c._id} | CaseNo: "${c.caseNumber}" | Client: "${c.clientName}" | Hearings: ${c.hearingsHistory?.length || 0}`);
  }

  // Add a sample hearing to first case
  if (cases.length > 0) {
    const first = cases[0];
    first.hearingsHistory = [
      {
        hearingDate: '28-09-2026',
        hearingNotes: 'Hearing completed. Preliminary arguments presented.',
        nextHearingDate: '15-10-2026',
        stage: 'Hearing completed',
        addedBy: 'Arun'
      }
    ];
    first.nextHearing = '15-10-2026';
    await first.save();
    console.log('Added initial hearing to:', first.caseNumber);
  }
  process.exit(0);
});
