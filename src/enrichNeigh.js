import 'dotenv/config';
import mysql from "mysql2/promise";
import { dbConfig } from "../config/dbConfig.js";
import fetch from "node-fetch";
import { fileURLToPath } from 'url';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Set your OpenAI API key in your environment

async function getNeighborhood(parkingheld, borough) {
  // Enhanced Times Square detection
  const location = parkingheld.toLowerCase();

  // Direct Times Square keywords
  const directTimesSquareKeywords = [
    'times square', 'theater district', 'duffy square', 'tkts', 'red steps'
  ];

  if (directTimesSquareKeywords.some(keyword => location.includes(keyword))) {
    return { neighborhood: "Times Square", source: "keyword" };
  }

  // Geographic boundaries for Times Square area
  // Times Square is roughly bounded by 40th-50th Street and 6th-8th Avenue, with Broadway
  const isTimesSquareArea = (location) => {
    // Check for street numbers between 40-50 and avenue combinations
    const streetMatch = location.match(/(?:west\s+|east\s+)?(\d{2})\s*(?:nd|rd|th)?\s+street/);
    const hasRelevantAvenue = location.includes('7') || location.includes('6') || location.includes('8') || location.includes('broadway');

    if (streetMatch) {
      const streetNum = parseInt(streetMatch[1]);
      // Times Square core area
      if (streetNum >= 40 && streetNum <= 50 && hasRelevantAvenue) {
        // Additional checks for Broadway in the Times Square area
        if (location.includes('broadway') && streetNum >= 40 && streetNum <= 50) {
          return true;
        }
        // 42nd Street is iconic Times Square
        if (streetNum === 42) {
          return true;
        }
        // 7th Avenue between 40th-47th is Times Square core
        if (location.includes('7') && location.includes('avenue') && streetNum >= 40 && streetNum <= 47) {
          return true;
        }
        // Extend coverage for 6th-7th Ave between 42nd-47th
        if ((location.includes('6') || location.includes('7')) && location.includes('avenue') && streetNum >= 42 && streetNum <= 47) {
          return true;
        }
      }
    }

    // Check for Broadway in Times Square area specifically
    if (location.includes('broadway')) {
      const broadwayTimesSquarePatterns = [
        /broadway.*between.*(?:west\s+)?4[0-9]/,
        /(?:west\s+)?4[0-9].*street.*broadway/,
        /broadway.*(?:west\s+)?4[2-7]/
      ];

      if (broadwayTimesSquarePatterns.some(pattern => pattern.test(location))) {
        return true;
      }
    }

    return false;
  };

  if (isTimesSquareArea(location)) {
    return { neighborhood: "Times Square", source: "geographic" };
  }

  const prompt = `Given the parking held location "${parkingheld}" in the borough "${borough}" of NYC, what is the most likely neighborhood? Respond with only the neighborhood name.`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0
    })
  });
  const data = await response.json();
  const neighborhood = data.choices?.[0]?.message?.content?.trim() || null;

  // Map Theater District and similar responses to Times Square
  if (neighborhood) {
    const lowerNeighborhood = neighborhood.toLowerCase();
    if (lowerNeighborhood.includes('theater district') ||
      lowerNeighborhood.includes('theatre district') ||
      lowerNeighborhood === 'theater district' ||
      lowerNeighborhood === 'theatre district') {
      return { neighborhood: "Times Square", source: "openai-mapped" };
    }
  }

  return neighborhood ? { neighborhood, source: "openai" } : null;
}

async function updateTimesSquareRecords() {
  const connection = await mysql.createConnection(dbConfig);

  // Ensure the neighborhood and nhoodsource columns exist
  await connection.execute(
    "ALTER TABLE film_data ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255)"
  );
  await connection.execute(
    "ALTER TABLE film_data ADD COLUMN IF NOT EXISTS nhoodsource VARCHAR(50)"
  );

  // Get records that might be Times Square for processing
  const [rows] = await connection.execute(
    `SELECT eventid, parkingheld, borough FROM film_data
     WHERE startdatetime >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     AND borough = 'Manhattan' 
     AND category IN ('Film', 'Television')
     AND (neighborhood IS NULL OR neighborhood = '')
     AND (
       LOWER(parkingheld) LIKE '%times square%' OR
       LOWER(parkingheld) LIKE '%theater district%' OR
       LOWER(parkingheld) LIKE '%duffy square%' OR
       LOWER(parkingheld) LIKE '%tkts%' OR
       LOWER(parkingheld) LIKE '%red steps%' OR
       (LOWER(parkingheld) LIKE '%42%street%') OR
       (LOWER(parkingheld) LIKE '%broadway%' AND (
         LOWER(parkingheld) LIKE '%4[0-9]%' OR
         LOWER(parkingheld) LIKE '%west%4[0-9]%'
       )) OR
       (LOWER(parkingheld) LIKE '%7%avenue%' AND (
         LOWER(parkingheld) LIKE '%4[0-9]%' OR
         LOWER(parkingheld) LIKE '%west%4[0-9]%'
       ))
     )`
  );

  let updatedCount = 0;

  for (const row of rows) {
    const result = await getNeighborhood(row.parkingheld, row.borough);
    if (result && result.neighborhood === "Times Square") {
      await connection.execute(
        "UPDATE film_data SET neighborhood = ?, nhoodsource = ? WHERE eventid = ?",
        [result.neighborhood, result.source, row.eventid]
      );
      updatedCount++;
      console.log(`Updated eventid ${row.eventid} to Times Square (${result.source}): ${row.parkingheld}`);
    }
  }

  console.log(`Updated ${updatedCount} records to Times Square neighborhood (enhanced detection, last 6 months)`);
  await connection.end();
}

async function enrichNeighborhoods() {
  const connection = await mysql.createConnection(dbConfig);

  // Ensure the neighborhood and nhoodsource columns exist
  await connection.execute(
    "ALTER TABLE film_data ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255)"
  );
  await connection.execute(
    "ALTER TABLE film_data ADD COLUMN IF NOT EXISTS nhoodsource VARCHAR(50)"
  );

  // Select rows from the past 6 months with missing neighborhood and category "Film" or "Television"
  const [rows] = await connection.execute(
    `SELECT eventid, parkingheld, borough FROM film_data
     WHERE startdatetime >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     AND (neighborhood IS NULL OR neighborhood = '')
     AND category IN ('Film', 'Television')`
  );

  for (const row of rows) {
    if (!row.parkingheld || !row.borough) continue;
    try {
      const result = await getNeighborhood(row.parkingheld, row.borough);
      if (result && result.neighborhood) {
        await connection.execute(
          "UPDATE film_data SET neighborhood = ?, nhoodsource = ? WHERE eventid = ?",
          [result.neighborhood, result.source, row.eventid]
        );
        console.log(`Updated eventid ${row.eventid} with neighborhood: ${result.neighborhood} (${result.source})`);
      }
    } catch (err) {
      console.error(`Failed for eventid ${row.eventid}:`, err.message);
    }
    // Delay to avoid rate limits (adjust as needed)
    await new Promise(res => setTimeout(res, 1200));
  }

  await connection.end();
  console.log("Neighborhood enrichment complete.");
}

// Run the enrichment if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      // Update existing Times Square records first
      await updateTimesSquareRecords();
      // Then run regular enrichment for remaining records
      await enrichNeighborhoods();
    } catch (error) {
      console.error("Error running enrichment:", error);
      process.exit(1);
    }
  })();
}