module.exports = function handler(req, res) {
  res.json({ apiKeyLoaded: !!process.env.OPENAI_API_KEY });
};
