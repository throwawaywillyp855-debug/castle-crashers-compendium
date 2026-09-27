exports.handler = async function (event) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: "Method not allowed"
            })
        };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const question = String(body.question || "").trim();

        if (!question) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Please enter a question."
                })
            };
        }

        if (question.length > 500) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Question is too long."
                })
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }

        const prompt = `
You are the AI assistant for an unofficial Castle Crashers fan compendium.

Answer the user's question specifically about the video game Castle Crashers.

Guidelines:
- Give a clear and useful answer.
- Be concise but provide enough detail to answer the question.
- Do not invent facts.
- If you are uncertain, clearly say what you are uncertain about.
- Distinguish established game information from community opinions or strategies.
- Do not pretend that you searched Reddit, the web, or another live source unless source material was actually provided to you.
- If the question is unrelated to Castle Crashers, politely explain that this assistant is intended for Castle Crashers questions.

User question:
${question}
        `.trim();

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 700
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data);

            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: "Gemini could not answer the question."
                })
            };
        }

        const answer =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

        if (!answer) {
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: "Gemini returned an empty response."
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                answer: answer,
                mode: "ai"
            })
        };

    } catch (error) {
        console.error(error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "The AI service is temporarily unavailable."
            })
        };
    }
};
