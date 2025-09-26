import 'dotenv/config';
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/dbConfig.js";
// Check if the dbConfig is defined correctly
console.log("Attempting DB connection with config:", {
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password ? '***' : 'undefined',
  database: dbConfig.database,
});
try {
  const testConnection = await mysql.createConnection(dbConfig);
  console.log("✅ Successfully connected to the database.");
  await testConnection.end();
} catch (err) {
  console.error("❌ Failed to connect to the database.");
  console.error(err);
};
// Get the current directory equivalent to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function fetchData() {
  const limit = 1000;
  let offset = 0;
  let allData = [];

  try {
    while (true) {
      const response = await fetch(
        `https://data.cityofnewyork.us/resource/tg4x-b46p.json?$limit=${limit}&$offset=${offset}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        return;
      }

      const result = await response.json();
      console.log(`Fetched ${result.length} rows with offset ${offset}`);

      if (result.length === 0) {
        break;
      }

      allData = [...allData, ...result];
      offset += limit;
    }

    console.log("All data fetched.");

    // Get all unique columns from the data
    const allColumns = new Set();
    allData.forEach(row => Object.keys(row).forEach(col => allColumns.add(col)));
    // Always include startdatetime and enddatetime for type handling
    allColumns.add("startdatetime");
    allColumns.add("enddatetime");
    const columns = Array.from(allColumns);

    // Connect to DB using the config
    const connection = await mysql.createConnection(dbConfig);

    // Ensure the film_data table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS film_data (
        id INT AUTO_INCREMENT PRIMARY KEY
      )
    `);

    // Get existing columns in the table
    const [existingColsRows] = await connection.execute(
      "SHOW COLUMNS FROM film_data"
    );
    const existingCols = existingColsRows.map(row => row.Field);

    // Add missing columns
    for (const col of columns) {
      if (!existingCols.includes(col)) {
        let type = "VARCHAR(255)";
        if (col === "startdatetime" || col === "enddatetime") {
          type = "DATETIME NULL";
        }
        await connection.execute(
          `ALTER TABLE film_data ADD COLUMN \`${col}\` ${type}`
        );
      }
    }

    // Insert data
    for (const row of allData) {
      const values = columns.map(col => {
        if (col === "startdatetime" && row.startdatetime) {
          const date = new Date(row.startdatetime);
          return !isNaN(date) ? date.toISOString().slice(0, 19).replace('T', ' ') : null;
        }
        if (col === "enddatetime" && row.enddatetime) {
          const date = new Date(row.enddatetime);
          return !isNaN(date) ? date.toISOString().slice(0, 19).replace('T', ' ') : null;
        }
        return row[col] ?? null;
      });
      const colNames = columns.map(col => `\`${col}\``).join(", ");
      const placeholders = columns.map(() => "?").join(", ");

      try {
        await connection.execute(
          `INSERT INTO film_data (${colNames}) VALUES (${placeholders})`,
          values
        );
      } catch (err) {
        // Check for "Data too long" error
        if (err.code === 'ER_DATA_TOO_LONG') {
          // Extract column name from error message
          const match = err.message.match(/Data too long for column '([^']+)'/);
          if (match) {
            const colName = match[1];
            console.warn(`Column '${colName}' too short, altering to TEXT and retrying...`);
            await connection.execute(
              `ALTER TABLE film_data MODIFY COLUMN \`${colName}\` TEXT`
            );
            // Retry the insert once
            await connection.execute(
              `INSERT INTO film_data (${colNames}) VALUES (${placeholders})`,
              values
            );
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    console.log("Data inserted into the database.");
    await connection.end();
  } catch (error) {
    console.error("Error fetching or inserting data:", error.message);
    console.error(error.stack);
  }
}