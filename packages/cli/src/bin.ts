#!/usr/bin/env node
import { resolve } from "node:path";
import { runCli } from "./command.js";

void runCli(
  process.argv.slice(2),
  { catalogRoot: resolve(__dirname, "catalog") },
  {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
).then((exitCode) => {
  process.exitCode = exitCode;
});
