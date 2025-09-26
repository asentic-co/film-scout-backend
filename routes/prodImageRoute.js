import express from "express";
import axios from "axios";

export default () => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }
    try {
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;
      const query = `${companyName} logo transparent background`;
      const response = await axios.get(
        "https://www.googleapis.com/customsearch/v1",
        {
          params: {
            key: apiKey,
            cx,
            q: query,
            searchType: "image",
            num: 1,
            safe: "active",
          },
        }
      );
      const item = response.data.items?.[0];
      const imageUrl = item?.link;
      const thumbnailUrl = item?.image?.thumbnailLink;
      if (!imageUrl) {
        return res.status(404).json({ error: "No logo found" });
      }
      // Log the image URL and thumbnail URL
      console.log(`Fetched logo for "${companyName}":`, {
        url: imageUrl,
        thumbnail: thumbnailUrl || null
      });
      res.json({
        url: imageUrl,
        thumbnail: thumbnailUrl || null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch company logo" });
    }
  });

  return router;
};