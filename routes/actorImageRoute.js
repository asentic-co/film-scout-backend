import express from "express";
import axios from "axios";

export default () => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { actorName } = req.body;
    if (!actorName) {
      return res.status(400).json({ error: "actorName is required" });
    }
    try {
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX_ID;
      const response = await axios.get(
        "https://www.googleapis.com/customsearch/v1",
        {
          params: {
            key: apiKey,
            cx,
            q: actorName,
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
        return res.status(404).json({ error: "No image found" });
      }
      res.json({ 
        url: imageUrl,
        thumbnail: thumbnailUrl || null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch actor image" });
    }
  });

  return router;
};