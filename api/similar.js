import Exa from "exa-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const exa = new Exa(process.env.EXA_API_KEY);
    const { url } = req.body;

    const results = await exa.findSimilar(url, { 
      numResults: 8, 
      contents: { summary: true } 
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}