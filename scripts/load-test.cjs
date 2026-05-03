const autocannon = require('autocannon');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';
const USER_EMAIL = 'priya@campus.edu';
const USER_PASSWORD = 'password123';

async function login() {
  console.log(`Logging in as ${USER_EMAIL}...`);
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD });
    const options = {
      hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body).token); }
          catch (e) { reject(new Error('Failed to parse login response')); }
        } else {
          reject(new Error(`Login failed with status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runScenario(name, options, { allowRateLimiting = false } = {}) {
  console.log(`\nRunning Scenario: ${name}`);
  console.log(`Connections: ${options.connections}, Duration: ${options.duration}s, Path: ${options.url}`);

  return new Promise((resolve, reject) => {
    autocannon(options, (err, result) => {
      if (err) return reject(err);

      const p50  = result.latency.p50;
      const p97_5 = result.latency.p97_5;
      const p99  = result.latency.p99;

      const hardErrors = result.errors + result.timeouts;
      const totalRequests = result.requests.sent;
      const hardErrorRate = (hardErrors / totalRequests) * 100;

      console.log(`P50:      ${p50}ms`);
      console.log(`P97.5:    ${p97_5}ms`);
      console.log(`P99:      ${p99}ms`);
      console.log(`Req/Sec:  ${result.requests.average}`);
      console.log(`Errors:   ${hardErrors} hard (timeouts/conn-errors)` +
        (allowRateLimiting ? `, ${result.non2xx} rate-limited (429 expected)` : `, ${result.non2xx} non-2xx`));

      resolve({ result, p99, hardErrorRate, allowRateLimiting, non2xx: result.non2xx });
    });
  });
}

async function main() {
  try {
    const token = await login();
    console.log('Login successful.');

    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const resultA = await runScenario('Scenario A — Feed (Medium Load, 50 conn)', {
      url: `${BASE_URL}/api/posts`, connections: 50, duration: 10, headers: authHeaders,
    });

    const resultB = await runScenario('Scenario B — Feed (High Load / Redis cache, 100 conn)', {
      url: `${BASE_URL}/api/posts`, connections: 100, duration: 10, headers: authHeaders,
    });

    const batchBody = JSON.stringify({
      requests: [
        { id: '1', path: '/posts?limit=5' },
        { id: '2', path: '/notifications' },
        { id: '3', path: '/chat/chatrooms' },
        { id: '4', path: '/chat/conversations' },
        { id: '5', path: '/marketplace' },
      ],
    });

    const resultC = await runScenario('Scenario C — Batch endpoint (20 conn, rate-limiting active)', {
      url: `${BASE_URL}/api/batch`, method: 'POST', body: batchBody,
      connections: 20, duration: 10, headers: authHeaders,
    }, { allowRateLimiting: true });

    console.log('\n─────────────────────────────────────────────');
    console.log('  FINAL VERDICT');
    console.log('─────────────────────────────────────────────');

    const all = [resultA, resultB, resultC];
    const labels = ['A', 'B', 'C'];
    let allPassed = true;

    all.forEach(({ result, p99, hardErrorRate, allowRateLimiting }, i) => {
      const p99Pass = p99 < 500;
      const errPass = allowRateLimiting
        ? hardErrorRate < 1
        : (result.errors + result.timeouts + result.non2xx) / result.requests.sent * 100 < 1;

      const passed = p99Pass && errPass;
      const note = allowRateLimiting ? ' (429s excluded from error rate)' : '';
      console.log(`Scenario ${labels[i]}: ${passed ? 'PASS ✓' : 'FAIL ✗'} — P99 ${p99}ms, hard-error rate ${hardErrorRate.toFixed(2)}%${note}`);
      if (!passed) allPassed = false;
    });

    console.log('─────────────────────────────────────────────');
    console.log(`OVERALL: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log('─────────────────────────────────────────────');
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('Load test failed:', error.message);
    process.exit(1);
  }
}

main();
