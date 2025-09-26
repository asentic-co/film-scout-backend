import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/dbConfig.js";

const router = express.Router();

// DB Check endpoint: test connection, show hostname, check/create table
router.get('/db-check', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // Check if table exists
        const [rows] = await connection.execute("SHOW TABLES LIKE 'curated_images'");
        let tableExists = rows.length > 0;
        let tableCreated = false;
        // If not, create it
        if (!tableExists) {
            try {
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS curated_images (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        url VARCHAR(512) NOT NULL,
                        title VARCHAR(255),
                        search_phrase VARCHAR(255),
                        curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                tableExists = true;
                tableCreated = true;
                console.log("[curatedImagesRoute] Created curated_images table via db-check");
            } catch (createErr) {
                if (createErr.message.includes("Tablespace already exists")) {
                    console.warn("[curatedImagesRoute] Tablespace conflict, attempting to drop and recreate table...");
                    try {
                        await connection.execute(`DROP TABLE IF EXISTS curated_images`);
                        await connection.execute(`
                            CREATE TABLE curated_images (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                url VARCHAR(512) NOT NULL,
                                title VARCHAR(255),
                                search_phrase VARCHAR(255),
                                curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                        tableExists = true;
                        tableCreated = true;
                        console.log("[curatedImagesRoute] Successfully recreated curated_images table after tablespace conflict");
                    } catch (retryErr) {
                        console.error("[curatedImagesRoute] Failed to recreate table after tablespace conflict:", retryErr);
                        throw retryErr;
                    }
                } else {
                    throw createErr;
                }
            }
        }
        // Get DB connection hostname from config (where we're connecting TO)
        const connectionHost = dbConfig.host || 'localhost';
        let dbServerHostname = connectionHost;

        // Optionally, also get the database server's internal hostname for additional info
        let serverInternalHostname = null;
        try {
            const [hostRow] = await connection.query('SELECT @@hostname as hostname');
            if (hostRow && hostRow[0] && hostRow[0].hostname) {
                serverInternalHostname = hostRow[0].hostname;
            }
        } catch (e) { /* ignore if query fails */ }

        await connection.end();
        res.json({
            dbAvailable: true,
            hostname: connectionHost, // Show connection hostname (localhost, mariadb, etc.)
            serverHostname: serverInternalHostname, // Optional: internal server hostname
            tableExists,
            tableCreated
        });
    } catch (err) {
        res.json({ dbAvailable: false, error: err.message });
    }
});

// Get all curated images
router.get("/", async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        let rows;
        try {
            [rows] = await connection.execute("SELECT * FROM curated_images ORDER BY curated_at DESC");
        } catch (err) {
            // If table doesn't exist, create it and retry
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.warn("[curatedImagesRoute] Table missing, creating curated_images table...");
                try {
                    await connection.execute(`
                        CREATE TABLE IF NOT EXISTS curated_images (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            url VARCHAR(512) NOT NULL,
                            title VARCHAR(255),
                            search_phrase VARCHAR(255),
                            curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                } catch (createErr) {
                    if (createErr.message.includes("Tablespace already exists")) {
                        console.warn("[curatedImagesRoute] Tablespace conflict, attempting to drop and recreate table...");
                        await connection.execute(`DROP TABLE IF EXISTS curated_images`);
                        await connection.execute(`
                            CREATE TABLE curated_images (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                url VARCHAR(512) NOT NULL,
                                title VARCHAR(255),
                                search_phrase VARCHAR(255),
                                curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                    } else {
                        throw createErr;
                    }
                }
                [rows] = await connection.execute("SELECT * FROM curated_images ORDER BY curated_at DESC");
            } else {
                throw err;
            }
        }
        await connection.end();
        res.json(rows);
    } catch (err) {
        if (connection) await connection.end();
        console.error("[curatedImagesRoute] GET error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Add a new curated image
router.post("/", async (req, res) => {
    const { url, title, searchPhrase } = req.body;
    if (!url) {
        return res.status(400).json({ error: "Image URL is required" });
    }
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        let result;
        try {
            [result] = await connection.execute(
                "INSERT INTO curated_images (url, title, search_phrase) VALUES (?, ?, ?)",
                [url, title || null, searchPhrase || null]
            );
        } catch (err) {
            // If table doesn't exist, create it and retry
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.warn("[curatedImagesRoute] Table missing, creating curated_images table...");
                try {
                    await connection.execute(`
                        CREATE TABLE IF NOT EXISTS curated_images (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            url VARCHAR(512) NOT NULL,
                            title VARCHAR(255),
                            search_phrase VARCHAR(255),
                            curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                } catch (createErr) {
                    if (createErr.message.includes("Tablespace already exists")) {
                        console.warn("[curatedImagesRoute] Tablespace conflict, attempting to drop and recreate table...");
                        await connection.execute(`DROP TABLE IF EXISTS curated_images`);
                        await connection.execute(`
                            CREATE TABLE curated_images (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                url VARCHAR(512) NOT NULL,
                                title VARCHAR(255),
                                search_phrase VARCHAR(255),
                                curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                    } else {
                        throw createErr;
                    }
                }
                [result] = await connection.execute(
                    "INSERT INTO curated_images (url, title, search_phrase) VALUES (?, ?, ?)",
                    [url, title || null, searchPhrase || null]
                );
            } else {
                throw err;
            }
        }
        await connection.end();
        res.status(201).json({ id: result.insertId, url, title, searchPhrase });
    } catch (err) {
        if (connection) await connection.end();
        console.error("[curatedImagesRoute] POST error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Delete a curated image by ID
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute("DELETE FROM curated_images WHERE id = ?", [id]);
        } catch (err) {
            // If table doesn't exist, create it (empty table, so delete has no effect)
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.warn("[curatedImagesRoute] Table missing, creating curated_images table...");
                try {
                    await connection.execute(`
                        CREATE TABLE IF NOT EXISTS curated_images (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            url VARCHAR(512) NOT NULL,
                            title VARCHAR(255),
                            search_phrase VARCHAR(255),
                            curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                } catch (createErr) {
                    if (createErr.message.includes("Tablespace already exists")) {
                        console.warn("[curatedImagesRoute] Tablespace conflict, attempting to drop and recreate table...");
                        await connection.execute(`DROP TABLE IF EXISTS curated_images`);
                        await connection.execute(`
                            CREATE TABLE curated_images (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                url VARCHAR(512) NOT NULL,
                                title VARCHAR(255),
                                search_phrase VARCHAR(255),
                                curated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                    } else {
                        throw createErr;
                    }
                }
                // No need to retry delete since table is empty
            } else {
                throw err;
            }
        }
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        if (connection) await connection.end();
        console.error("[curatedImagesRoute] DELETE error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
