const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  // Only allow POST requests
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

    // Get OpenAI API key from Netlify
    const apiKey = process.env.OPEN_AI_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "OPEN_AI_KEY is not configured in Netlify."
        })
      };
    }

    // Read question from website
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

    // Send question to OpenAI
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

    // Read OpenAI response
    const data = await response.json();

    // Show actual OpenAI errors for troubleshooting
    if (!response.ok) {

      const openAIError =
        data?.error?.message ||
        `OpenAI returned HTTP ${response.status}`;

      console.error(
        "OpenAI API error:",
        response.status,
        openAIError
      );

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `OpenAI error ${response.status}: ${openAIError}`
        })
      };
    }

    // Extract generated text from OpenAI response
    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n")
      .trim();

    // Make sure OpenAI actually returned an answer
    if (!answer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "OpenAI returned an empty answer."
        })
      };
    }

    // Send OpenAI answer back to website
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer: answer
      })
    };

  } catch (error) {

    console.error(
      "Function error:",
      error.message
    );

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Function error: ${error.message}`
      })
    };
  }
};
