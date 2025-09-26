import OpenAI from "openai";

export default function inferProductionRoute(client, inferUnknownHandler) {
  return async (req, res) => {
    const record = req.body;
    if (!record) return res.status(400).json({ error: "Missing record data" });

    const prompt = `
Given the following event details, infer:
- The most likely film or TV production name.
- The most likely affiliated media company or network (such as "HBO", "Netflix", "CBS", etc).

Respond in this exact JSON format:
{
  "productionName": "<production name or Unknown>",
  "company": "<company/network name or Unknown>"
}

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

      // Log the raw output from OpenAI
      console.log("Raw OpenAI output:", response.output_text);

      let output = {};
      try {
        // Extract JSON block from the output_text
        const match = response.output_text.match(/```json\s*([\s\S]*?)\s*```/i);
        const jsonString = match ? match[1] : response.output_text;
        output = JSON.parse(jsonString);
      } catch {
        output = { productionName: "Unknown", company: "Unknown" };
      }

      // Fallback phrase filtering
      const fallbackPhrases = [
        "I'm unable to determine",
        "I am unable to determine",
        "Cannot determine",
        "Not enough information",
        "unknown",
        "No production name found",
        "Sorry",
        "N/A"
      ];
      ["productionName", "company"].forEach((key) => {
        if (
          !output[key] ||
          fallbackPhrases.some(
            (phrase) => output[key].trim().toLowerCase() === phrase.toLowerCase()
          )
        ) {
          output[key] = "Unknown";
        }
      });

      // If production name is "Unknown", try the fallback inference
      if (output.productionName === "Unknown" && inferUnknownHandler) {
        console.log("Primary inference returned Unknown, trying fallback inference...");

        // Call the unknown inference handler
        return inferUnknownHandler(req, res);
      }

      // Log the returned production information
      console.log("Infer Production Output:", JSON.stringify(output, null, 2));

      // Ensure response is in the correct format
      res.json({
        productionName: output.productionName,
        record: {
          company: output.company,
        },
      });
    } catch (err) {
      console.error("OpenAI error:", err);
      res.status(500).json({ error: "Failed to infer production name/company" });
    }
  };
}