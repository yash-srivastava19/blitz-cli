#!/usr/bin/env bun
import { $ } from "bun";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

const targets = [
  { target: "bun-linux-x64",   out: "dist/blitz-linux-x64" },
  { target: "bun-linux-arm64", out: "dist/blitz-linux-arm64" },
  { target: "bun-darwin-x64",  out: "dist/blitz-darwin-x64" },
  { target: "bun-darwin-arm64",out: "dist/blitz-darwin-arm64" },
] as const;

const buildTarget = process.argv[2]; // optional: build just one target

for (const { target, out } of targets) {
  if (buildTarget && !target.includes(buildTarget)) continue;
  console.log(`Building ${out} ...`);
  await $`bun build --compile --minify --bytecode --target=${target} ./src/cli.ts --outfile ${out}`;
  console.log(`  ✓ ${out}`);
}

console.log("Build complete.");
