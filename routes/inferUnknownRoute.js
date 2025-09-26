import OpenAI from "openai";

export default function inferUnknownRoute(client) {
    return async (req, res) => {
        const record = req.body;
        if (!record) return res.status(400).json({ error: "Missing record data" });

        // Extract location information from the record
        const location = record.location || record.address || record.neighborhood || "location not specified";

        const prompt = `
Given the following event details from ${location}, infer the most likely film or TV production that has been known to film in this neighborhood or nearby areas within the past 6 months.

Consider:
- Recent filming activity in the area
- Productions known to use similar locations
- Local filming permits and industry news
- Geographic proximity to major studios

Respond in this exact JSON format:
{
  "productionName": "<most likely production name or Unknown>",
  "company": "<company/network name or Unknown>",
  "confidence": "<low|medium|high>"
}

Event Details:
${JSON.stringify(record, null, 2)}

If you cannot make a reasonable inference even with recent filming context, respond with "Unknown" for both fields.
    `.trim();

        try {
            const response = await client.responses.create({
                model: "gpt-4.1",
                tools: [{ type: "web_search_preview" }],
                input: prompt,
                temperature: 0.3, // Slightly higher temperature for more creative inference
            });

            // Log the raw output from OpenAI
            console.log("Raw OpenAI Unknown Inference output:", response.output_text);

            let output = {};
            try {
                // Extract JSON block from the output_text
                const match = response.output_text.match(/```json\s*([\s\S]*?)\s*```/i);
                const jsonString = match ? match[1] : response.output_text;
                output = JSON.parse(jsonString);
            } catch {
                output = {
                    productionName: "Unknown",
                    company: "Unknown",
                    confidence: "low"
                };
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

            // Ensure confidence is always present
            if (!output.confidence || !["low", "medium", "high"].includes(output.confidence.toLowerCase())) {
                output.confidence = "low";
            }

            // Log the returned production information
            console.log("Infer Unknown Production Output:", JSON.stringify(output, null, 2));

            // Return with "Maybe:" prefix if we got a result
            const productionName = output.productionName !== "Unknown"
                ? `Maybe: ${output.productionName}`
                : "Unknown";

            // Return in the same format as the main route, but with additional fields
            const response_data = {
                productionName,
                record: {
                    company: output.company,
                },
                confidence: output.confidence,
                isSpeculative: output.productionName !== "Unknown"
            };

            console.log("Final response data:", JSON.stringify(response_data, null, 2));

            res.json(response_data);
        } catch (err) {
            console.error("OpenAI Unknown Inference error:", err);
            res.status(500).json({ error: "Failed to infer unknown production name/company" });
        }
    };
}