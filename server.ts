import { createServer } from "node:http";
import { evaluate } from "./src/evaluate.js";
import { RUBRICS } from "./src/rubrics.js";

const PORT = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/evaluate") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { topic, explanation, confidence } = JSON.parse(body || "{}");
        const result = await evaluate({ topic, explanation, confidence });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result, null, 2));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/api/topics") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Object.keys(RUBRICS)));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found. POST /api/evaluate or GET /api/topics." }));
});

server.listen(PORT, () => {
  console.log(`TeachBack AI evaluation API listening on http://localhost:${PORT}`);
  console.log(`Try: curl -X POST http://localhost:${PORT}/api/evaluate -H "Content-Type: application/json" -d '{"topic":"Binary Search","confidence":90,"explanation":"..."}'`);
});
