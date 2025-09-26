import 'dotenv/config';
console.log(`[${new Date().toISOString()}] 🚀 Starting backend server.js`);
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { dbConfig } from "./config/dbConfig.js";
import OpenAI from "openai";
import inferProductionRoute from "./routes/inferProdRoute.js";
import inferActorsRoute from "./routes/inferActorsRoute.js";
import suggestedNeighborhoods from './routes/suggestedNeigh.js';
import actorImageRoute from "./routes/actorImageRoute.js";
import productionTeaserRoute from "./routes/productionTeaserRoute.js";
import prodImageRoute from "./routes/prodImageRoute.js";
import inferUnknownRoute from './routes/inferUnknownRoute.js';
import newsImagesRoute from "./routes/newsImagesRoute.js";
import curatedImagesRoute from "./routes/curatedImagesRoute.js";
import curatedNewsImageRoute from "./routes/curatedNewsImageRoute.js";
import proxyImageRoute from "./routes/proxyImageRoute.js";


console.log(`[${new Date().toISOString()}] Loading express and middleware...`);
const app = express();
app.use(cors());
app.use(express.json());
console.log(`[${new Date().toISOString()}] Express middleware loaded.`);

// Root route to confirm server availability and a quick DB health check
app.get('/', async (req, res) => {
  // Serve a small mobile-friendly HTML health page.
  // The DB check is performed and presented on its own line for clarity.
  const timeoutMs = 3000;

  try {
    const countPromise = (async () => {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM film_data');
      await connection.end();
      return Array.isArray(rows) && rows.length > 0 ? rows[0].count : 0;
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB query timeout')), timeoutMs)
    );

    const count = await Promise.race([countPromise, timeoutPromise]);
    const lastChecked = new Date().toISOString();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>API Health</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:12px;max-width:720px;width:100%;padding:20px;box-shadow:0 6px 18px rgba(16,24,40,0.06);text-align:center}
    .status{font-size:18px;color:#065f46;margin-bottom:6px}
    .emoji{font-size:48px;margin:6px 0}
    .count{font-size:16px;color:#0f172a;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px}
    .db-ok{color:#16a34a;font-weight:700}
    .db-fail{color:#b91c1c;font-weight:700}
    .note{font-size:13px;color:#6b7280;margin-top:8px}
    .btn{display:inline-block;margin-top:14px;padding:8px 14px;background:#2563eb;color:#fff;border-radius:8px;border:none;font-weight:600;text-decoration:none}
    @media (max-width:420px){.card{padding:14px}.emoji{font-size:40px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="status">✅ API server is running and available.</div>
    <div class="emoji" aria-hidden="true">🎬</div>
    <div class="count"><span class="db-ok" aria-hidden="true">✅</span>film_data rows: ${count}</div>
    <div class="note">Database check: OK • Last checked: ${lastChecked}</div>
    <form method="get"><button class="btn" type="submit">Refresh</button></form>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Root route DB check failed:', err && err.message ? err.message : err);
    const lastChecked = new Date().toISOString();
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>API Health</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:12px;max-width:720px;width:100%;padding:20px;box-shadow:0 6px 18px rgba(16,24,40,0.06);text-align:center}
    .status{font-size:18px;color:#b91c1c;margin-bottom:6px}
    .emoji{font-size:48px;margin:6px 0}
    .count{font-size:16px;color:#0f172a;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px}
    .db-ok{color:#16a34a;font-weight:700}
    .db-fail{color:#b91c1c;font-weight:700}
    .note{font-size:13px;color:#6b7280;margin-top:8px}
    .btn{display:inline-block;margin-top:14px;padding:8px 14px;background:#2563eb;color:#fff;border-radius:8px;border:none;font-weight:600;text-decoration:none}
    @media (max-width:420px){.card{padding:14px}.emoji{font-size:40px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="status">✅ API server is running and available.</div>
    <div class="emoji" aria-hidden="true">⚠️</div>
    <div class="count"><span class="db-fail" aria-hidden="true">❌</span>Database check: unavailable (see server logs for details)</div>
    <div class="note">Last checked: ${lastChecked}</div>
    <form method="get"><button class="btn" type="submit">Try again</button></form>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
});
console.log(`[${new Date().toISOString()}] Root route registered.`);

// Serve static images from the /images directory
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/images', express.static(path.join(__dirname, 'images')));
console.log(`[${new Date().toISOString()}] Static image route registered.`);

console.log(`[${new Date().toISOString()}] Initializing OpenAI client...`);
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
console.log(`[${new Date().toISOString()}] OpenAI client initialized.`);

// Borough detection and normalization
const detectBorough = (searchTerm) => {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  const boroughMappings = {
    'manhattan': ['manhattan', 'new york', 'ny', 'nyc'],
    'brooklyn': ['brooklyn', 'bk', 'bkln'],
    'queens': ['queens', 'queen'],
    'bronx': ['bronx', 'the bronx'],
    'staten island': ['staten island', 'si', 'staten']
  };

  for (const [canonical, variations] of Object.entries(boroughMappings)) {
    if (variations.includes(normalizedTerm)) {
      return canonical;
    }
  }

  return null; // Not a borough
};

// Neighborhood name normalization for better search matching
const normalizeNeighborhood = (neighborhood) => {
  const normalizedName = neighborhood.trim().toLowerCase();

  // Handle common variations and aliases
  const neighborhoodMappings = {
    'times square': ['times square', 'theater district', 'midtown west'],
    'harlem': ['harlem', 'central harlem', 'east harlem', 'spanish harlem'],
    'williamsburg': ['williamsburg', 'williamsburg brooklyn'],
    'bushwick': ['bushwick', 'bushwick brooklyn'],
    'long island city': ['long island city', 'lic', 'queens', 'long island city queens'],
    'midtown': ['midtown', 'midtown manhattan', 'midtown east', 'midtown west'],
    'upper west side': ['upper west side', 'uws'],
    'greenpoint': ['greenpoint', 'greenpoint brooklyn']
  };

  // Find the canonical name and return all variations
  for (const [canonical, variations] of Object.entries(neighborhoodMappings)) {
    if (variations.includes(normalizedName)) {
      return variations;
    }
  }

  // If no mapping found, return the original normalized name
  return [normalizedName];
};

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, req.body || '');
  next();
});

app.get("/events", async (req, res) => {
  try {
    const { borough, neighborhood, categories, limit } = req.query;
    let query = `SELECT * FROM film_data WHERE startdatetime >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND (TRIM(LOWER(category)) = 'film' OR TRIM(LOWER(category)) = 'television')`;
    let params = [];

    if (borough) {
      query += ` AND TRIM(LOWER(borough)) = ?`;
      params.push(borough.trim().toLowerCase());
    }

    if (neighborhood) {
      const decodedNeighborhood = decodeURIComponent(neighborhood);

      // First check if the neighborhood input is actually a borough name
      const detectedBorough = detectBorough(decodedNeighborhood);

      if (detectedBorough) {
        // If it's a borough, search by borough instead of neighborhood
        query += ` AND TRIM(LOWER(borough)) = ?`;
        params.push(detectedBorough);
        console.log(`Detected borough search: ${decodedNeighborhood} -> ${detectedBorough}`);
      } else {
        // Otherwise, search by neighborhood as usual
        const neighborhoodVariations = normalizeNeighborhood(decodedNeighborhood);

        if (neighborhoodVariations.length > 1) {
          // Use OR condition for multiple variations
          const neighborhoodPlaceholders = neighborhoodVariations.map(() => 'TRIM(LOWER(neighborhood)) = ?').join(' OR ');
          query += ` AND (${neighborhoodPlaceholders})`;
          params.push(...neighborhoodVariations);
        } else {
          // Single neighborhood variation
          query += ` AND TRIM(LOWER(neighborhood)) = ?`;
          params.push(neighborhoodVariations[0]);
        }
        console.log(`Neighborhood search: ${decodedNeighborhood} -> ${neighborhoodVariations}`);
      }
    }

    if (categories) {
      const categoryList = categories.split(',').map(cat => cat.trim().toLowerCase());
      const categoryPlaceholders = categoryList.map(() => 'TRIM(LOWER(category)) = ?').join(' OR ');
      query += ` AND (${categoryPlaceholders})`;
      params.push(...categoryList);
    }

    // Use limit parameter if provided, otherwise default to 1
    const recordLimit = limit ? parseInt(limit, 10) : 1;
    query += ` ORDER BY startdatetime DESC LIMIT ${recordLimit}`;

    console.log('Executing query:', query, 'with params:', params);
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(query, params);
    await connection.end();

    if (rows.length > 0) {
      console.log(`Found ${rows.length} record(s) for search term: ${neighborhood}`);
    } else {
      console.log('No records found for query.');
    }

    // Log the film data sent up to the dashboard
    console.log('Sending film data to dashboard:', rows);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const inferUnknownHandler = inferUnknownRoute(openaiClient);
const inferProductionHandler = inferProductionRoute(openaiClient, inferUnknownHandler);

app.post('/infer-production', inferProductionHandler);
app.post('/infer-unknown', inferUnknownHandler);
app.post("/infer-actors", inferActorsRoute(openaiClient));
app.use("/infer-company-logo", prodImageRoute());
app.use('/suggested-neighborhoods', suggestedNeighborhoods);
app.use('/actor-image', actorImageRoute());
app.use("/production-teaser", productionTeaserRoute(openaiClient));

app.use('/news-images', newsImagesRoute());
app.use('/curated-images', curatedImagesRoute);
// Curated News Image API
app.use('/curated-news-image', curatedNewsImageRoute);
app.use('/proxy-image', proxyImageRoute());

// Debug endpoint to check available neighborhoods in database
app.get("/neighborhoods", async (req, res) => {
  try {
    const query = `SELECT DISTINCT neighborhood, COUNT(*) as count 
                   FROM film_data 
                   WHERE startdatetime >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
                   AND (TRIM(LOWER(category)) = 'film' OR TRIM(LOWER(category)) = 'television')
                   AND neighborhood IS NOT NULL AND neighborhood != ''
                   GROUP BY neighborhood 
                   ORDER BY count DESC 
                   LIMIT 50`;

    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(query);
    await connection.end();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

console.log("Google Custom Search CX:", process.env.GOOGLE_CUSTOM_SEARCH_CX_ID ? "Loaded" : "Missing");
console.log("OpenAI API Key:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
console.log(`[${new Date().toISOString()}] Environment variables loaded.`);

// Test DB connection at startup with timeout
console.log(`[${new Date().toISOString()}] Testing DB connection at startup...`);
(async () => {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );

    const connectionPromise = (async () => {
      console.log(`[${new Date().toISOString()}] Attempting to connect to DB with config:`, dbConfig);
      const connection = await mysql.createConnection(dbConfig);
      await connection.ping();
      await connection.end();
      return 'Connected';
    })();

    await Promise.race([connectionPromise, timeoutPromise]);
    console.log(`[${new Date().toISOString()}] ✅ Successfully connected to the MySQL database`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to connect to the MySQL database:`);
    console.error(err);
    if (err instanceof Error && err.message) {
      console.error('Error message:', err.message);
    }
    if (err instanceof Error && err.stack) {
      console.error('Stack trace:', err.stack);
    }
    console.log('Server will continue to run, but database operations may fail.');
  }
})();
// Port check and log result
const PORT = process.env.PORT || 4000;
console.log(`[${new Date().toISOString()}] About to start listening on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] 🚦 Server running on port ${PORT}`);
});