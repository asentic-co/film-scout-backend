import express from "express";
import axios from "axios";

export default () => {
    const router = express.Router();

    // Debug endpoint to check API configuration
    router.get("/health", (req, res) => {
        const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;

        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            config: {
                hasApiKey: !!apiKey,
                hasCxId: !!cx,
                apiKeyLength: apiKey ? apiKey.length : 0,
                cxIdLength: cx ? cx.length : 0
            }
        });
    });

    router.post("/", async (req, res) => {
        const { searchTerm, newsType } = req.body;

        console.log(`[newsImagesRoute] POST request - searchTerm: "${searchTerm}", newsType: "${newsType}"`);

        if (!searchTerm) {
            console.log('[newsImagesRoute] Error: searchTerm is required');
            return res.status(400).json({ error: "searchTerm is required" });
        }

        try {
            const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
            const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;

            console.log(`[newsImagesRoute] API Key: ${apiKey ? 'Present' : 'Missing'}, CX: ${cx ? 'Present' : 'Missing'}`);

            if (!apiKey || !cx) {
                console.log('[newsImagesRoute] Error: Missing Google API credentials');
                return res.status(500).json({
                    error: "Google API credentials not configured",
                    fallback: {
                        url: null,
                        thumbnail: null,
                        altText: `No image available for ${searchTerm}`,
                        isGenerated: false,
                        message: "Google API credentials not configured"
                    }
                });
            }

            // Build search query based on news type and content
            let enhancedQuery = searchTerm;

            // Add context based on news type
            if (newsType === 'location') {
                enhancedQuery += ' filming location NYC movie set';
            } else if (newsType === 'production') {
                enhancedQuery += ' movie film production behind scenes';
            } else {
                // General news enhancement
                enhancedQuery += ' film industry news';
            }

            console.log(`[newsImagesRoute] Enhanced query: "${enhancedQuery}"`);

            const response = await axios.get(
                "https://www.googleapis.com/customsearch/v1",
                {
                    params: {
                        key: apiKey,
                        cx,
                        q: enhancedQuery,
                        searchType: "image",
                        num: 6, // Get up to 6 images for the frontend grid
                        safe: "active",
                        imgSize: "medium", // Good balance of quality and size
                        imgType: "photo", // Prefer photos over clipart
                        rights: "cc_publicdomain,cc_attribute,cc_sharealike", // Try to get images with usage rights
                    },
                }
            );

            console.log(`[newsImagesRoute] Google API response status: ${response.status}`);
            console.log(`[newsImagesRoute] Items found: ${response.data.items?.length || 0}`);

            const items = response.data.items || [];

            if (items.length === 0) {
                console.log('[newsImagesRoute] No images found for query');
                return res.status(404).json({ error: "No images found" });
            }

            // Return the best image (first result) plus alternatives
            const primaryImage = items[0];
            const alternatives = items.slice(1);

            console.log(`[newsImagesRoute] Success - Primary image: ${primaryImage.link}`);

            res.json({
                primary: {
                    url: primaryImage.link,
                    thumbnail: primaryImage.image?.thumbnailLink || null,
                    title: primaryImage.title || '',
                    altText: `Image related to ${searchTerm}`,
                    contextUrl: primaryImage.image?.contextLink || null,
                    width: primaryImage.image?.width || null,
                    height: primaryImage.image?.height || null,
                    isGenerated: false // These are real images from Google
                },
                alternatives: alternatives.map(item => ({
                    url: item.link,
                    thumbnail: item.image?.thumbnailLink || null,
                    title: item.title || '',
                    altText: `Alternative image for ${searchTerm}`,
                    contextUrl: item.image?.contextLink || null,
                    width: item.image?.width || null,
                    height: item.image?.height || null,
                    isGenerated: false
                })),
                searchQuery: enhancedQuery,
                totalResults: response.data.searchInformation?.totalResults || 0
            });

        } catch (err) {
            console.error('News image search error:', err);

            // Return a fallback response with placeholder info
            res.status(500).json({
                error: "Failed to fetch news image",
                fallback: {
                    url: null,
                    thumbnail: null,
                    altText: `No image available for ${searchTerm}`,
                    isGenerated: false,
                    message: "Image search temporarily unavailable"
                }
            });
        }
    });
    // Add POST /search route to match frontend requests
    router.post("/search", async (req, res) => {
        const { searchTerm, newsType } = req.body;

        console.log(`[newsImagesRoute] POST /search - searchTerm: "${searchTerm}", newsType: "${newsType}"`);

        if (!searchTerm) {
            console.log('[newsImagesRoute] Error: searchTerm is required');
            return res.status(400).json({ error: "searchTerm is required" });
        }

        try {
            const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
            const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;

            console.log(`[newsImagesRoute] API Key: ${apiKey ? 'Present' : 'Missing'}, CX: ${cx ? 'Present' : 'Missing'}`);

            if (!apiKey || !cx) {
                console.log('[newsImagesRoute] Error: Missing Google API credentials');
                return res.status(500).json({
                    error: "Google API credentials not configured",
                    fallback: {
                        url: null,
                        thumbnail: null,
                        altText: `No image available for ${searchTerm}`,
                        isGenerated: false,
                        message: "Google API credentials not configured"
                    }
                });
            }

            // Build search query based on news type and content
            let enhancedQuery = searchTerm;

            // Add context based on news type
            if (newsType === 'location') {
                enhancedQuery += ' filming location NYC movie set';
            } else if (newsType === 'production') {
                enhancedQuery += ' movie film production behind scenes';
            } else {
                // General news enhancement
                enhancedQuery += ' film industry news';
            }

            console.log(`[newsImagesRoute] Enhanced query: "${enhancedQuery}"`);

            const response = await axios.get(
                "https://www.googleapis.com/customsearch/v1",
                {
                    params: {
                        key: apiKey,
                        cx,
                        q: enhancedQuery,
                        searchType: "image",
                        num: 6, // Get 6 images to fill the frontend grid
                        safe: "active",
                        imgSize: "medium", // Good balance of quality and size
                        imgType: "photo", // Prefer photos over clipart
                        rights: "cc_publicdomain,cc_attribute,cc_sharealike", // Try to get images with usage rights
                    },
                }
            );

            console.log(`[newsImagesRoute] Google API response status: ${response.status}`);
            console.log(`[newsImagesRoute] Items found: ${response.data.items?.length || 0}`);

            const items = response.data.items || [];

            if (items.length === 0) {
                console.log('[newsImagesRoute] No images found for query');
                return res.status(404).json({ error: "No images found" });
            }

            // Return the best image (first result) plus alternatives
            const primaryImage = items[0];
            const alternatives = items.slice(1);

            console.log(`[newsImagesRoute] Success - Primary image: ${primaryImage.link}`);

            // Create a combined images array for frontend compatibility
            const allImages = [
                {
                    url: primaryImage.link,
                    thumbnail: primaryImage.image?.thumbnailLink || null,
                    title: primaryImage.title || '',
                    altText: `Image related to ${searchTerm}`,
                    contextUrl: primaryImage.image?.contextLink || null,
                    width: primaryImage.image?.width || null,
                    height: primaryImage.image?.height || null,
                    isGenerated: false
                },
                ...alternatives.map(item => ({
                    url: item.link,
                    thumbnail: item.image?.thumbnailLink || null,
                    title: item.title || '',
                    altText: `Alternative image for ${searchTerm}`,
                    contextUrl: item.image?.contextLink || null,
                    width: item.image?.width || null,
                    height: item.image?.height || null,
                    isGenerated: false
                }))
            ];

            res.json({
                images: allImages, // Add this for frontend compatibility
                primary: {
                    url: primaryImage.link,
                    thumbnail: primaryImage.image?.thumbnailLink || null,
                    title: primaryImage.title || '',
                    altText: `Image related to ${searchTerm}`,
                    contextUrl: primaryImage.image?.contextLink || null,
                    width: primaryImage.image?.width || null,
                    height: primaryImage.image?.height || null,
                    isGenerated: false // These are real images from Google
                },
                alternatives: alternatives.map(item => ({
                    url: item.link,
                    thumbnail: item.image?.thumbnailLink || null,
                    title: item.title || '',
                    altText: `Alternative image for ${searchTerm}`,
                    contextUrl: item.image?.contextLink || null,
                    width: item.image?.width || null,
                    height: item.image?.height || null,
                    isGenerated: false
                })),
                searchQuery: enhancedQuery,
                totalResults: response.data.searchInformation?.totalResults || 0
            });

        } catch (err) {
            console.error('News image search error:', err);

            // Return a fallback response with placeholder info
            res.status(500).json({
                error: "Failed to fetch news image",
                fallback: {
                    url: null,
                    thumbnail: null,
                    altText: `No image available for ${searchTerm}`,
                    isGenerated: false,
                    message: "Image search temporarily unavailable"
                }
            });
        }
    });

    // GET endpoint for direct search term queries
    router.get("/search", async (req, res) => {
        const { q: searchTerm, type: newsType } = req.query;

        if (!searchTerm) {
            return res.status(400).json({ error: "Search term (q) is required" });
        }

        // Create request body and delegate to the main handler logic
        const requestBody = { searchTerm, newsType };

        try {
            const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
            const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;

            // Build search query based on news type and content
            let enhancedQuery = searchTerm;

            // Add context based on news type
            if (newsType === 'location') {
                enhancedQuery += ' filming location NYC movie set';
            } else if (newsType === 'production') {
                enhancedQuery += ' movie film production behind scenes';
            } else {
                // General news enhancement
                enhancedQuery += ' film industry news';
            }

            const response = await axios.get(
                "https://www.googleapis.com/customsearch/v1",
                {
                    params: {
                        key: apiKey,
                        cx,
                        q: enhancedQuery,
                        searchType: "image",
                        num: 3,
                        safe: "active",
                        imgSize: "medium",
                        imgType: "photo",
                        rights: "cc_publicdomain,cc_attribute,cc_sharealike",
                    },
                }
            );

            const items = response.data.items || [];

            if (items.length === 0) {
                return res.status(404).json({ error: "No images found" });
            }

            // Return the best image (first result) plus alternatives
            const primaryImage = items[0];
            const alternatives = items.slice(1);

            res.json({
                primary: {
                    url: primaryImage.link,
                    thumbnail: primaryImage.image?.thumbnailLink || null,
                    title: primaryImage.title || '',
                    altText: `Image related to ${searchTerm}`,
                    contextUrl: primaryImage.image?.contextLink || null,
                    width: primaryImage.image?.width || null,
                    height: primaryImage.image?.height || null,
                    isGenerated: false
                },
                alternatives: alternatives.map(item => ({
                    url: item.link,
                    thumbnail: item.image?.thumbnailLink || null,
                    title: item.title || '',
                    altText: `Alternative image for ${searchTerm}`,
                    contextUrl: item.image?.contextLink || null,
                    width: item.image?.width || null,
                    height: item.image?.height || null,
                    isGenerated: false
                })),
                searchQuery: enhancedQuery,
                totalResults: response.data.searchInformation?.totalResults || 0
            });

        } catch (err) {
            console.error('News image search error:', err);

            // Return a fallback response with placeholder info
            res.status(500).json({
                error: "Failed to fetch news image",
                fallback: {
                    url: null,
                    thumbnail: null,
                    altText: `No image available for ${searchTerm}`,
                    isGenerated: false,
                    message: "Image search temporarily unavailable"
                }
            });
        }
    });

    return router;
};
