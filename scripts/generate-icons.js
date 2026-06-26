const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  let len = Buffer.alloc(4);
  len.writeUInt32BE(13);
  const ihdrChunk = Buffer.concat([len, Buffer.from("IHDR"), ihdr]);
  const ihdrCRC = Buffer.alloc(4);
  ihdrCRC.writeUInt32BE(crc32(ihdrChunk.subarray(4)));

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const off = row + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw);
  len = Buffer.alloc(4);
  len.writeUInt32BE(compressed.length);
  const idatChunk = Buffer.concat([len, Buffer.from("IDAT"), compressed]);
  const idatCRC = Buffer.alloc(4);
  idatCRC.writeUInt32BE(crc32(idatChunk.subarray(4)));

  len = Buffer.alloc(4);
  len.writeUInt32BE(0);
  const iendChunk = Buffer.concat([len, Buffer.from("IEND")]);
  const iendCRC = Buffer.alloc(4);
  iendCRC.writeUInt32BE(crc32(iendChunk.subarray(4)));

  return Buffer.concat([
    sig,
    ihdrChunk, ihdrCRC,
    idatChunk, idatCRC,
    iendChunk, iendCRC,
  ]);
}

const dir = path.join(__dirname, "..", "assets");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon.png"), createPNG(1024, 1024, 41, 98, 255));
fs.writeFileSync(path.join(dir, "adaptive-icon.png"), createPNG(1024, 1024, 41, 98, 255));
fs.writeFileSync(path.join(dir, "splash-icon.png"), createPNG(1284, 2778, 41, 98, 255));
fs.writeFileSync(path.join(dir, "favicon.png"), createPNG(48, 48, 41, 98, 255));
console.log("Icons created successfully");
