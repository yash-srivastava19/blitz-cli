import { join } from "path";
import { mkdirSync } from "fs";

const home = process.env.HOME ?? "/tmp";
export const DATA_DIR = join(home, ".local", "share", "blitz");
export const DB_FILE = join(DATA_DIR, "tasks.db");
export const STATE_FILE = join(DATA_DIR, "state.json");

// Ensure data directory exists on import
mkdirSync(DATA_DIR, { recursive: true });
