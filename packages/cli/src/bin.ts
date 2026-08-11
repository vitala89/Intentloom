#!/usr/bin/env node
import { resolve } from "node:path";
import { runCliEntry } from "./cli-entry.js";

void runCliEntry(
  process.argv.slice(2),
  { catalogRoot: resolve(__dirname, "catalog") },
  {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
).then((exitCode) => {
  process.exitCode = exitCode;
});
