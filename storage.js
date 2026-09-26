// All exercises live in one JSON file. Replacing this file is all it takes to move to SQLite or another database.
import fs from "node:fs/promises";

const FILE = "data/exercises.json";

export async function list() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function save(exercise) {
  const all = await list();
  all.push(exercise);
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}
