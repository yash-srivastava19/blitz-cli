#!/usr/bin/env bun
import { render } from "ink";
import React from "react";
import { App } from "./ui/App.js";

// Enter alternate screen buffer, clear, move to home
process.stdout.write("\x1b[?1049h\x1b[2J\x1b[H");

// Restore terminal on exit
process.on("exit", () => {
  process.stdout.write("\x1b[?1049l");
});

// Handle Ctrl-C gracefully
process.on("SIGINT", () => {
  process.exit(0);
});

const { waitUntilExit } = render(React.createElement(App), {
  exitOnCtrlC: true,
});

await waitUntilExit();
