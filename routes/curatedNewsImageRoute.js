// backend/routes/curatedNewsImageRoute.js
import express from 'express';
import mysql from 'mysql2/promise';
import { dbConfig } from '../config/dbConfig.js';

const router = express.Router();

// GET /curated-news-image - returns a random curated image from the database
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        // Get a random image
        const [rows] = await connection.execute(
            'SELECT * FROM curated_images ORDER BY RAND() LIMIT 1'
        );
        await connection.end();
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No curated images found' });
        }
        // Return only the relevant fields
        const { url, title, search_phrase, id } = rows[0];
        res.json({ url, title, searchPhrase: search_phrase, id });
    } catch (err) {
        if (connection) await connection.end();
        console.error('[curatedNewsImageRoute] GET error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
