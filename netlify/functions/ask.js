const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {

  // Handle browser security checks
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
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    const { question } = JSON.parse(event.body || "{}");

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 1000
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Please provide a valid question."
        })
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "gpt-4.1-mini",

          instructions:
            "You are a knowledgeable Castle Crashers game assistant. " +
            "Answer questions about Castle Crashers, including characters, " +
            "weapons, Animal Orbs, levels, bosses, gameplay mechanics, " +
            "strategies, and game history. " +
            "Provide accurate, concise, helpful answers. " +
            "If you are uncertain, say so rather than inventing information.",

          input: question.trim(),

          max_output_tokens: 500
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        data.error?.message
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "The AI service could not complete the request."
        })
      };
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n")
      .trim();

    if (!answer) {
      throw new Error("OpenAI returned an empty answer");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer
      })
    };

  } catch (error) {

    console.error("Function error:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Unable to generate an answer right now."
      })
    };
  }
};
