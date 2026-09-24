const http = require('http');

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- 1. Testing GET /api/cases ---');
  const getCasesRes = await makeRequest('http://localhost:5000/api/cases');
  const cases = getCasesRes.data;
  console.log('Total cases:', Array.isArray(cases) ? cases.length : 0);

  if (!cases || cases.length === 0) {
    console.log('No cases found to test.');
    return;
  }

  const targetCase = cases[0];
  const targetId = targetCase._id;
  console.log(`Testing with Case: ${targetCase.caseNumber} (ID: ${targetId}), current status: ${targetCase.status}`);

  console.log('\n--- 2. Junior Requests Case Closure ---');
  const reqClosureRes = await makeRequest(`http://localhost:5000/api/cases/${targetId}/request-closure`, 'POST', {
    reason: 'Proceedings completed in court. Final decree issued.',
    requestedBy: 'Arun'
  });
  console.log('Request closure status code:', reqClosureRes.status);
  console.log('Request closure response:', reqClosureRes.data.success, reqClosureRes.data.message);
  console.log('New Case Status:', reqClosureRes.data.case?.status);

  console.log('\n--- 3. Admin Checks Pending Closures ---');
  const pendingRes = await makeRequest('http://localhost:5000/api/cases/pending-closures');
  console.log('Pending closures count:', pendingRes.data.count);

  console.log('\n--- 4. Admin Closes Case ---');
  const closeRes = await makeRequest(`http://localhost:5000/api/cases/${targetId}/close`, 'POST', {
    closureDate: '28-09-2026',
    closureReason: 'Final Judgement Delivered / Decreed in favour of client',
    finalRemarks: 'Case disposed. All original documents returned to client.',
    closedBy: 'Abraham'
  });
  console.log('Close case status code:', closeRes.status);
  console.log('Close case response:', closeRes.data.success, closeRes.data.message);
  console.log('Final Case Status:', closeRes.data.case?.status);
  console.log('Closure Details:', closeRes.data.case?.closureDetails);
  console.log('Hearings count:', closeRes.data.case?.hearingsHistory?.length);

  console.log('\n--- 5. Verify Junior Assigned Cases Stats ---');
  const juniorStatsRes = await makeRequest('http://localhost:5000/api/juniors/assigned-cases?juniorName=Arun');
  console.log('Junior Stats:', juniorStatsRes.data.stats);
}

runTest().catch(console.error);
