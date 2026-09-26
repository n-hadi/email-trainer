import express from "express";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { generateScenario, evaluate, writeModelAnswer } from "./llm.js";
import { checkLanguage } from "./languagetool.js";
import * as storage from "./storage.js";

const app = express();
app.use(express.json());

app.post("/api/scenario", async (req, res) => {
  res.json(await generateScenario(req.body));
});

app.get("/api/exercises", async (req, res) => {
  res.json(await storage.list());
});

// Receives a submitted exercise, analyses it and stores the complete record.
app.post("/api/exercises", async (req, res) => {
  const exercise = req.body;
  const [languageAnalysis, evaluation, modelAnswer] = await Promise.all([
    checkLanguage(exercise.submission, exercise.configuration.language),
    evaluate(exercise),
    writeModelAnswer(exercise),
  ]);
  const complete = { ...exercise, languageAnalysis, evaluation, modelAnswer };
  await storage.save(complete);
  res.json(complete);
});

app.use("/api", (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Vite serves the React app from the same port, so the browser only ever talks to this server.
const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "spa" });
app.use(vite.middlewares);

const port = process.env.PORT || 5173;
app.listen(port, () => console.log(`Email trainer running at http://localhost:${port}`));
