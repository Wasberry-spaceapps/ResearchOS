import Exa from "exa-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const exa = new Exa(process.env.EXA_API_KEY);
    const { query, startYear, endYear, useAutoprompt } = req.body;

    const results = await exa.searchAndContents(query, {
      type: useAutoprompt ? "neural" : "keyword",
      numResults: 10,
      startPublishedDate: startYear ? `${startYear}-01-01` : undefined,
      endPublishedDate: endYear ? `${endYear}-12-31` : undefined,
      includeDomains: [
        "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "biorxiv.org", 
        "nature.com", "sciencedirect.com", "scholar.google.com", 
        "plos.org", "cell.com"
      ],
      contents: { summary: true }
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}