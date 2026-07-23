#!/usr/bin/env node
import { resolve } from "node:path";
import { handleMcpRequest, encodeMcpFrame } from "./index.js";

const rootFlag = process.argv.indexOf("--root");
const root = resolve(
  rootFlag >= 0 && process.argv[rootFlag + 1]
    ? process.argv[rootFlag + 1]!
    : process.cwd(),
);

let buffer = Buffer.alloc(0);
process.stdin.on("data", async (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString("utf8");
    const match = /^Content-Length:\s*(\d+)$/im.exec(header);
    if (!match) {
      process.stderr.write("invalid MCP frame header\n");
      process.exitCode = 2;
      return;
    }
    const length = Number(match[1]);
    const start = headerEnd + 4;
    if (buffer.length < start + length) return;
    const body = buffer.subarray(start, start + length).toString("utf8");
    buffer = buffer.subarray(start + length);
    try {
      const response = await handleMcpRequest(JSON.parse(body), { root });
      if (response) process.stdout.write(encodeMcpFrame(response));
    } catch {
      process.stderr.write("invalid MCP request\n");
    }
  }
});
