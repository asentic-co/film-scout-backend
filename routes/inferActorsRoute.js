import OpenAI from "openai";

export default function inferActorsRoute(client) {
  return async (req, res) => {
    const record = req.body;
    if (!record) return res.status(400).json({ error: "Missing record data" });

    const prompt = `
Given the following event details, infer the names of three actors in the most likely film or TV production. Respond with a JSON array of the actor names, and nothing else.

Event Details:
${JSON.stringify(record, null, 2)}
    `.trim();

    try {
      const response = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
        temperature: 0.2,
      });

      let actors = [];

      try {
        actors = JSON.parse(response.output_text);
        if (!Array.isArray(actors)) actors = [];
      } catch (parseError) {
        // Fallback: Try to extract names from a comma-separated string or JSON-like format
        const match = response.output_text.match(/"([^"]+)"/g);
        if (match) {
          actors = match.map(s => s.replace(/"/g, '').trim()).filter(Boolean).slice(0, 3);
        } else {
          // Try another pattern for comma-separated names
          const commaMatch = response.output_text.match(/([A-Za-z .'-]+)(?:,|\]|$)/g);
          if (commaMatch) {
            actors = commaMatch.map(s => s.replace(/[",\]]/g, '').trim()).filter(Boolean).slice(0, 3);
          }
        }
      }

      res.json({ actors });
    } catch (err) {
      console.error("OpenAI error:", err);
      res.status(500).json({ error: "Failed to infer lead actors" });
    }
  };
}