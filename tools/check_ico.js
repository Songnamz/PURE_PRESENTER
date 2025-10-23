const fs = require('fs');
const path = require('path');

function readIco(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error('Not a valid ICO file');
  }
  const count = buf.readUInt16LE(4);
  console.log(`Icon entries: ${count}`);
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    const width = buf.readUInt8(offset);
    const height = buf.readUInt8(offset + 1);
    const colorCount = buf.readUInt8(offset + 2);
    const planes = buf.readUInt16LE(offset + 4);
    const bitCount = buf.readUInt16LE(offset + 6);
    const bytesInRes = buf.readUInt32LE(offset + 8);
    const imageOffset = buf.readUInt32LE(offset + 12);
    console.log(`Entry ${i + 1}: ${width || 256}x${height || 256}, colors:${colorCount}, planes:${planes}, bpp:${bitCount}, bytes:${bytesInRes}, offset:${imageOffset}`);
  }
}

const icoPath = path.resolve(__dirname, '..', 'assets', 'PURE PRESENTER.ico');
try {
  if (!fs.existsSync(icoPath)) {
    console.error('Icon not found at', icoPath);
    process.exit(2);
  }
  console.log('Inspecting', icoPath);
  readIco(icoPath);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
