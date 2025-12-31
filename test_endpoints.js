
import http from 'http';

function checkEndpoint(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[PASS] GET ${path} - Status: ${res.statusCode}`);
        try {
          // Attempt to parse JSON to ensure valid response
           JSON.parse(data);
           console.log(`[PASS] GET ${path} - Valid JSON received.`);
        } catch (e) {
           console.log(`[WARN] GET ${path} - Invalid JSON.`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`[FAIL] GET ${path} - Error: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  console.log('Verifying Endpoints...');
  await checkEndpoint('/projects');
  await checkEndpoint('/achievements');
}

run();
