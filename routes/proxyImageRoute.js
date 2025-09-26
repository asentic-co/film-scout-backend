// backend/routes/proxyImageRoute.js
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url');
    try {
        const response = await fetch(url);
        if (!response.ok) return res.status(403).send('Image not accessible');
        res.set('Content-Type', response.headers.get('content-type'));
        response.body.pipe(res);
    } catch (err) {
        res.status(500).send('Error fetching image');
    }
});

export default () => router;