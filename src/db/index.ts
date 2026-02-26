import { Database } from "bun:sqlite";
import { DB_FILE } from "../utils/paths.js";
import { SCHEMA } from "./schema.js";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_FILE, { create: true });
  // Run schema — split on semicolons, filter empty
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
    _db.run(stmt);
  }
  return _db;
}
