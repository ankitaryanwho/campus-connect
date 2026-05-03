/**
 * Full load test: 100 and 200 concurrent users
 * Reports: latency, error rate, CPU usage, DB connections, slow queries, index stats
 */

const autocannon = require("autocannon");
const http = require("http");
const { execSync } = require("child_process");
const { Pool } = require("pg");

const BASE_URL = "http://127.0.0.1:5000";
const EMAIL = "priya@campus.edu";
const PASSWORD = "password123";
const DB_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

const db = new Pool({ connectionString: DB_URL, max: 3 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hr(char = "─", w = 68) { return char.repeat(w); }
function header(title) { console.log(`\n${hr("═")}\n  ${title}\n${hr("═")}`); }
function section(title) { console.log(`\n${hr()}  ${title}\n${hr()}`); }

function getCpuSnapshot() {
  try {
    // sum CPU% of all node/tsx processes
    const out = execSync(
      `ps aux | grep -E "tsx|node" | grep -v grep | awk '{sum+=$3} END {printf "%.1f", sum}'`,
      { encoding: "utf8", timeout: 3000 }
    ).trim();
    return parseFloat(out) || 0;
  } catch { return 0; }
}

function getLoadAvg() {
  try {
    const out = execSync("cat /proc/loadavg", { encoding: "utf8", timeout: 2000 }).trim();
    const [l1, l5, l15] = out.split(" ");
    return { l1, l5, l15 };
  } catch { return { l1: "n/a", l5: "n/a", l15: "n/a" }; }
}

async function login() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const req = http.request(
      { hostname: "127.0.0.1", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data).token);
          } else {
            reject(new Error(`Login ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── DB stats queries ─────────────────────────────────────────────────────────

async function dbConnections() {
  const { rows } = await db.query(`
    SELECT state, count(*)::int AS count
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
    ORDER BY count DESC
  `);
  const total = rows.reduce((s, r) => s + r.count, 0);
  return { total, by_state: rows };
}

async function dbMaxConnections() {
  const { rows } = await db.query(`SELECT setting::int AS max FROM pg_settings WHERE name = 'max_connections'`);
  return rows[0]?.max || "?";
}

async function dbPoolUsage() {
  // active connections from pg_stat_activity for our app
  const { rows } = await db.query(`
    SELECT
      count(*) FILTER (WHERE state = 'active')::int   AS active,
      count(*) FILTER (WHERE state = 'idle')::int     AS idle,
      count(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_tx,
      count(*)::int                                   AS total
    FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
  `);
  return rows[0];
}

async function dbTableStats() {
  const { rows } = await db.query(`
    SELECT
      relname AS table,
      seq_scan,
      idx_scan,
      n_live_tup AS live_rows,
      round(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 1) AS idx_pct
    FROM pg_stat_user_tables
    ORDER BY (seq_scan + idx_scan) DESC
    LIMIT 10
  `);
  return rows;
}

async function dbIndexStats() {
  const { rows } = await db.query(`
    SELECT
      t.relname AS table,
      i.indexrelname AS index,
      i.idx_scan,
      i.idx_tup_read,
      i.idx_tup_fetch
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON t.relid = i.relid
    ORDER BY i.idx_scan DESC
    LIMIT 15
  `);
  return rows;
}

async function dbUnusedIndexes() {
  const { rows } = await db.query(`
    SELECT
      t.relname AS table,
      i.indexrelname AS index,
      pg_size_pretty(pg_relation_size(i.indexrelid)) AS size
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON t.relid = i.relid
    WHERE i.idx_scan = 0
      AND t.n_live_tup > 0
    ORDER BY pg_relation_size(i.indexrelid) DESC
    LIMIT 10
  `);
  return rows;
}

async function dbSlowQueries() {
  // Check if pg_stat_statements is available
  try {
    const { rows } = await db.query(`
      SELECT
        left(query, 80) AS query,
        calls,
        round(mean_exec_time::numeric, 2) AS mean_ms,
        round(max_exec_time::numeric, 2)  AS max_ms,
        round(total_exec_time::numeric, 2) AS total_ms,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > 10
        AND query NOT LIKE '%pg_stat%'
        AND query NOT LIKE 'BEGIN%'
        AND query NOT LIKE 'COMMIT%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);
    return { available: true, rows };
  } catch {
    // pg_stat_statements not enabled — use pg_stat_activity long-running queries
    try {
      const { rows } = await db.query(`
        SELECT
          left(query, 80) AS query,
          state,
          round(extract(epoch from (now() - query_start))::numeric, 2) AS running_sec
        FROM pg_stat_activity
        WHERE state != 'idle'
          AND query_start IS NOT NULL
          AND query NOT LIKE '%pg_stat%'
          AND datname = current_database()
        ORDER BY query_start
        LIMIT 10
      `);
      return { available: false, rows };
    } catch {
      return { available: false, rows: [] };
    }
  }
}

// ─── CPU polling during a test ────────────────────────────────────────────────

function pollCpu(intervalMs, durationMs) {
  const samples = [];
  const start = Date.now();
  const id = setInterval(() => {
    samples.push(getCpuSnapshot());
    if (Date.now() - start >= durationMs) clearInterval(id);
  }, intervalMs);
  return {
    stop: () => { clearInterval(id); return samples; },
    samples,
  };
}

// ─── Scenario runner ──────────────────────────────────────────────────────────

async function runScenario(label, options) {
  return new Promise((resolve, reject) => {
    autocannon(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function printResult(label, result, cpuSamples, dbBefore, dbAfter) {
  const p50   = result.latency.p50;
  const p75   = result.latency.p75;
  const p99   = result.latency.p99;
  const p999  = result.latency.p99_9 ?? "n/a";
  const rps   = result.requests.average;
  const total = result.requests.sent;
  const hardErr  = result.errors + result.timeouts;
  const nonOk    = result.non2xx;
  const errRate  = ((hardErr / total) * 100).toFixed(2);
  const non2xxPct = ((nonOk / total) * 100).toFixed(2);

  const cpuMin  = cpuSamples.length ? Math.min(...cpuSamples).toFixed(1) : "n/a";
  const cpuMax  = cpuSamples.length ? Math.max(...cpuSamples).toFixed(1) : "n/a";
  const cpuAvg  = cpuSamples.length
    ? (cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length).toFixed(1)
    : "n/a";

  section(`RESULTS — ${label}`);

  console.log("\n  ── Response Times ──────────────────────────────");
  console.log(`  P50  (median)   : ${p50} ms`);
  console.log(`  P75             : ${p75} ms`);
  console.log(`  P99             : ${p99} ms`);
  console.log(`  P99.9           : ${p999} ms`);
  console.log(`  Min             : ${result.latency.min} ms`);
  console.log(`  Max             : ${result.latency.max} ms`);

  console.log("\n  ── Throughput ──────────────────────────────────");
  console.log(`  Requests/sec    : ${rps}`);
  console.log(`  Total requests  : ${total}`);
  console.log(`  Duration        : ${result.duration} s`);

  console.log("\n  ── Error Rate ──────────────────────────────────");
  console.log(`  Hard errors     : ${hardErr}  (${errRate}%)  ← connection drops / timeouts`);
  console.log(`  Non-2xx         : ${nonOk}  (${non2xxPct}%)  ← 4xx/5xx responses`);
  const rateLimit429 = nonOk > 0 ? " (may include 429 rate-limit responses)" : "";
  if (nonOk > 0) console.log(`                   ${rateLimit429}`);

  console.log("\n  ── CPU Usage (Node/API process) ────────────────");
  console.log(`  Min             : ${cpuMin}%`);
  console.log(`  Average         : ${cpuAvg}%`);
  console.log(`  Peak            : ${cpuMax}%`);

  console.log("\n  ── DB Connections ──────────────────────────────");
  console.log(`  Before test     : ${dbBefore.total} total  (active: ${dbBefore.active}, idle: ${dbBefore.idle})`);
  console.log(`  Peak (during)   : ${dbAfter.total} total  (active: ${dbAfter.active}, idle: ${dbAfter.idle})`);

  const verdict = p99 < 500 && parseFloat(errRate) < 1;
  console.log(`\n  VERDICT: ${verdict ? "✓ PASS" : "✗ FAIL"} — P99 ${p99}ms, hard-err ${errRate}%`);
}

function printDbSection(dbStats, tableStats, indexStats, unusedIdx, slowQ) {
  section("DATABASE DIAGNOSTICS");

  console.log(`\n  ── Connection Pool ─────────────────────────────`);
  console.log(`  Max DB connections (PostgreSQL): ${dbStats.maxConn}`);
  console.log(`  App pool max (code)            : 25  (lib/db/src/index.ts)`);
  console.log(`  Current connections to DB      :`);
  dbStats.after200.by_state.forEach((r) =>
    console.log(`    ${(r.state || "other").padEnd(20)}: ${r.count}`)
  );

  console.log(`\n  ── Table Scan vs Index Usage ───────────────────`);
  console.log(`  ${"Table".padEnd(28)} ${"SeqScan".padEnd(10)} ${"IdxScan".padEnd(10)} ${"Rows".padEnd(10)} IdxPct`);
  console.log(`  ${hr("-", 66)}`);
  tableStats.forEach((r) => {
    console.log(
      `  ${(r.table || "").padEnd(28)} ${String(r.seq_scan ?? 0).padEnd(10)} ` +
      `${String(r.idx_scan ?? 0).padEnd(10)} ${String(r.live_rows ?? 0).padEnd(10)} ` +
      `${r.idx_pct ?? 0}%`
    );
  });

  console.log(`\n  ── Top Indexes by Usage ────────────────────────`);
  console.log(`  ${"Table".padEnd(22)} ${"Index".padEnd(36)} ${"Scans".padEnd(8)} Rows Fetched`);
  console.log(`  ${hr("-", 66)}`);
  indexStats.slice(0, 10).forEach((r) => {
    console.log(
      `  ${(r.table || "").padEnd(22)} ${(r.index || "").padEnd(36)} ` +
      `${String(r.idx_scan ?? 0).padEnd(8)} ${r.idx_tup_fetch ?? 0}`
    );
  });

  if (unusedIdx.length > 0) {
    console.log(`\n  ── Unused Indexes (0 scans, tables with data) ──`);
    unusedIdx.forEach((r) =>
      console.log(`  ${r.table.padEnd(28)} ${r.index.padEnd(36)} ${r.size}`)
    );
  } else {
    console.log(`\n  ── Unused Indexes: none ✓`);
  }

  console.log(`\n  ── Slow Queries ────────────────────────────────`);
  if (!slowQ.available) {
    console.log(`  pg_stat_statements not enabled.`);
    if (slowQ.rows.length > 0) {
      console.log(`  Currently running queries:`);
      slowQ.rows.forEach((r) =>
        console.log(`  [${r.state}] ${r.running_sec}s  ${r.query}`)
      );
    } else {
      console.log(`  No long-running queries at rest.`);
    }
    console.log(`\n  To enable: CREATE EXTENSION pg_stat_statements;`);
    console.log(`  Then add shared_preload_libraries='pg_stat_statements' to postgresql.conf`);
  } else {
    if (slowQ.rows.length === 0) {
      console.log(`  No queries with mean_exec_time > 10ms ✓`);
    } else {
      console.log(`  ${"Mean(ms)".padEnd(10)} ${"Max(ms)".padEnd(10)} ${"Calls".padEnd(8)} Query`);
      slowQ.rows.forEach((r) =>
        console.log(`  ${String(r.mean_ms).padEnd(10)} ${String(r.max_ms).padEnd(10)} ${String(r.calls).padEnd(8)} ${r.query}`)
      );
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  header("CampusConnect — Load Test & DB Diagnostics");
  console.log(`  Target : ${BASE_URL}`);
  console.log(`  Date   : ${new Date().toISOString()}`);

  // Login
  process.stdout.write("\n  Logging in...");
  const token = await login();
  console.log(" done");

  const hdrs = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Baseline DB stats
  process.stdout.write("  Fetching baseline DB stats...");
  const maxConn = await dbMaxConnections();
  const baselineConn = await dbPoolUsage();
  const baselineConnDetail = await dbConnections();
  console.log(` done  (current: ${baselineConn.total} connections)`);

  const loadAvgBaseline = getLoadAvg();
  const cpuBaseline = getCpuSnapshot();

  console.log(`\n  ── Baseline (idle) ─────────────────────────────`);
  console.log(`  CPU (node processes)   : ${cpuBaseline}%`);
  console.log(`  Load avg (1/5/15 min)  : ${loadAvgBaseline.l1} / ${loadAvgBaseline.l5} / ${loadAvgBaseline.l15}`);
  console.log(`  DB connections         : ${baselineConn.total}  (active: ${baselineConn.active}, idle: ${baselineConn.idle})`);
  console.log(`  DB max_connections     : ${maxConn}`);

  // ── Scenario 1: 100 concurrent users ────────────────────────────────────────

  header("SCENARIO 1 — 100 Concurrent Users");
  console.log("  Endpoint : GET /api/posts  (15 s)");

  const dbBefore100 = await dbPoolUsage();
  const cpuPoller100 = pollCpu(1000, 16000);

  const result100 = await runScenario("100 concurrent", {
    url: `${BASE_URL}/api/posts`,
    connections: 100,
    duration: 15,
    headers: hdrs,
  });

  const cpuSamples100 = cpuPoller100.stop();
  const dbAfter100 = await dbPoolUsage();
  const dbAfter100Detail = await dbConnections();

  printResult(
    "100 Concurrent Users — GET /api/posts",
    result100,
    cpuSamples100,
    { ...dbBefore100, by_state: baselineConnDetail.by_state },
    dbAfter100
  );

  // ── Scenario 2: 200 concurrent users ────────────────────────────────────────

  header("SCENARIO 2 — 200 Concurrent Users");
  console.log("  Endpoint : GET /api/posts  (15 s)");
  console.log("  (3s warm-up pause...)");
  await new Promise((r) => setTimeout(r, 3000));

  const dbBefore200 = await dbPoolUsage();
  const cpuPoller200 = pollCpu(1000, 16000);

  const result200 = await runScenario("200 concurrent", {
    url: `${BASE_URL}/api/posts`,
    connections: 200,
    duration: 15,
    headers: hdrs,
  });

  const cpuSamples200 = cpuPoller200.stop();
  const dbAfter200 = await dbPoolUsage();
  const dbAfter200Detail = await dbConnections();

  printResult(
    "200 Concurrent Users — GET /api/posts",
    result200,
    cpuSamples200,
    { ...dbBefore200, by_state: dbAfter100Detail.by_state },
    dbAfter200
  );

  // ── DB Diagnostics ───────────────────────────────────────────────────────────

  const [tableStats, indexStats, unusedIdx, slowQ] = await Promise.all([
    dbTableStats(),
    dbIndexStats(),
    dbUnusedIndexes(),
    dbSlowQueries(),
  ]);

  printDbSection(
    { maxConn, after200: dbAfter200Detail },
    tableStats,
    indexStats,
    unusedIdx,
    slowQ
  );

  // ── Side-by-side comparison ──────────────────────────────────────────────────

  header("COMPARISON — 100 vs 200 Concurrent Users");
  const metrics = [
    ["Req/sec",    result100.requests.average,  result200.requests.average],
    ["P50 (ms)",   result100.latency.p50,        result200.latency.p50],
    ["P75 (ms)",   result100.latency.p75,        result200.latency.p75],
    ["P99 (ms)",   result100.latency.p99,        result200.latency.p99],
    ["P99.9 (ms)", result100.latency.p99_9 ?? "n/a", result200.latency.p99_9 ?? "n/a"],
    ["Errors",     result100.errors + result100.timeouts, result200.errors + result200.timeouts],
    ["Non-2xx",    result100.non2xx,              result200.non2xx],
    ["CPU peak %", Math.max(...cpuSamples100).toFixed(1), Math.max(...cpuSamples200).toFixed(1)],
    ["DB conns",   dbAfter100.total,              dbAfter200.total],
  ];

  console.log(`\n  ${"Metric".padEnd(18)} ${"100 users".padEnd(14)} 200 users`);
  console.log(`  ${hr("-", 46)}`);
  metrics.forEach(([label, v100, v200]) => {
    const flag = (typeof v100 === "number" && typeof v200 === "number" && v200 > v100 * 2) ? " ↑" : "";
    console.log(`  ${label.padEnd(18)} ${String(v100).padEnd(14)} ${v200}${flag}`);
  });

  console.log(`\n${hr("═")}\n`);

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  db.end().finally(() => process.exit(1));
});
