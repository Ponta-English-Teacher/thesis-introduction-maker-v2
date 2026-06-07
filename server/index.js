require("dotenv").config({ path: "../.env.local" });

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ apiKeyLoaded: !!process.env.OPENAI_API_KEY });
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    res.json({ message: completion.choices[0].message });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(502).json({ error: "Failed to reach OpenAI" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
