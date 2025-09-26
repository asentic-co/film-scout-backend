import express from "express";
import OpenAI from "openai";

export default (openaiClient) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { productionName } = req.body;
    if (!productionName) {
      return res.status(400).json({ error: "productionName is required" });
    }
    try {
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides a brief, interesting teaser about film and TV productions.",
          },
          {
            role: "user",
            content: `Give me a one-sentence teaser or fun fact about the production "${productionName}".`,
          },
        ],
        max_tokens: 60,
      });
      const teaser = completion.choices[0]?.message?.content?.trim();
      res.json({ teaser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch teaser" });
    }
  });

  return router;
};