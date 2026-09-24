require('dotenv').config();
const mongoose = require('mongoose');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/layerdb');
  const db = mongoose.connection.db;
  const cols = ['cases', 'juniors', 'payments', 'admins'];
  for (let c of cols) {
    const docs = await db.collection(c).find({}).toArray();
    console.log('\n=== COLLECTION: ' + c + ' (' + docs.length + ') ===');
    docs.forEach((d, i) => {
      console.log('[' + (i + 1) + '] ID: ' + d._id + ' | CaseNo: ' + (d.caseNumber || 'N/A') + ' | Client: ' + (d.clientName || 'N/A') + ' | Junior: ' + (d.juniorName || d.assignedJunior || d.name || d.enteredBy || 'N/A') + ' | Amount: ' + (d.amountReceived || 'N/A') + ' | Status: ' + (d.status || 'N/A'));
    });
  }
  await mongoose.disconnect();
}

inspect().catch(console.error);
