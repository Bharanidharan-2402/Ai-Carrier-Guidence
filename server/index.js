// server/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// 🟢 Google Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("Career AI Backend Running (Gemini + OpenRouter)");
});

// 🧠 Analyze questionnaire responses
app.post("/api/analyze", (req, res) => {
  const answers = req.body.answers;

  const score = {
    tech: 0,
    design: 0,
    management: 0,
  };

  answers.forEach((ans, index) => {
    if (
      [
        "Strongly Agree",
        "Excited",
        "Very Comfortable",
        "Coder",
        "[3, 2, 1]",
        "O(log n)",
        "matrix",
        "11",
        "JavaScript",
        "Building projects",
        "Weekly",
        "Yes",
        "4",
        "Debug patiently"
      ].includes(ans)
    ) {
      score.tech++;
    } else if (
      [
        "Designer",
        "Apps/Web",
        "UI/UX",
        "Creative",
        "Reading docs/books",
        "Live classes",
        "Video tutorials"
      ].includes(ans)
    ) {
      score.design++;
    } else if (
      [
        "Leader",
        "Tech Strategy",
        "Look for help",
        "Sometimes",
        "Neutral",
        "Only when required",
        "Overwhelmed"
      ].includes(ans)
    ) {
      score.management++;
    }
  });

  let recommendation = "Software Developer";
  if (score.design > score.tech && score.design > score.management) {
    recommendation = "UI/UX Designer";
  } else if (score.management > score.tech) {
    recommendation = "Project Manager";
  }

  res.json({ recommendation, score });
});

// 💬 OpenRouter Chatbot (fallback or choice)
app.post("/api/chat/openrouter", async (req, res) => {
  const { messages } = req.body;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI career counselor. Provide career advice, job roles, and learning paths based on student skills and interests.",
          },
          ...messages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
        },
      }
    );

    const reply = response.data.choices[0].message;
    res.json(reply);
  } catch (error) {
    console.error("🔴 OpenRouter Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error from OpenRouter API" });
  }
});

// 💬 Gemini Chatbot Route
app.post("/api/chat/gemini", async (req, res) => {
  const { messages } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const history = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a helpful AI career counselor. Provide job suggestions, learning paths, and growth advice based on the student's skills and interests.`,
            },
          ],
        },
        ...history,
      ],
    });

    const reply = result.response.text();
    res.json({ role: "assistant", content: reply });
  } catch (error) {
    console.error("🔴 Gemini Error:", error.message || error);
    res.status(500).json({
      error: "Error fetching reply from Gemini",
      details: error.message || error,
    });
  }
});

// 🟢 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});