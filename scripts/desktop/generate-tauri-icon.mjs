import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const size = 256;
const pixels = Buffer.alloc(size * size * 4);
const strokes = [
  [30, [109, 114, 246]],
  [-30, [75, 156, 232]],
  [90, [162, 155, 245]],
];

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const index = (y * size + x) * 4;
    pixels[index] = 15;
    pixels[index + 1] = 21;
    pixels[index + 2] = 36;
    pixels[index + 3] = 255;
    for (const [degrees, color] of strokes) {
      const angle = (degrees * Math.PI) / 180;
      const dx = x - 128;
      const dy = y - 128;
      const rotatedX = dx * Math.cos(angle) + dy * Math.sin(angle);
      const rotatedY = -dx * Math.sin(angle) + dy * Math.cos(angle);
      const ellipse =
        (rotatedX * rotatedX) / (88 * 88) + (rotatedY * rotatedY) / (42 * 42);
      if (Math.abs(ellipse - 1) < 0.055 && Math.hypot(dx, dy) < 112) {
        pixels[index] = color[0];
        pixels[index + 1] = color[1];
        pixels[index + 2] = color[2];
      }
    }
  }
}

const rows = Buffer.alloc(size * (size * 4 + 1));
for (let y = 0; y < size; y += 1) {
  rows[y * (size * 4 + 1)] = 0;
  pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  type.copy(header, 4);
  const checksum = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([type, data]));
  checksum.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([header, data, checksum]);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const output = Buffer.concat([
  signature,
  chunk(Buffer.from("IHDR"), header),
  chunk(Buffer.from("IDAT"), deflateSync(rows)),
  chunk(Buffer.from("IEND"), Buffer.alloc(0)),
]);

await mkdir("apps/desktop/src-tauri/icons", { recursive: true });
await writeFile("apps/desktop/src-tauri/icons/icon.png", output);
