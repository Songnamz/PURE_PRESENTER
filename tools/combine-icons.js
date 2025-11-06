const fs = require('fs');
const path = require('path');

// Combine multiple single-resolution .ico files into one multi-resolution .ico file
function combineIcons(inputFiles, outputFile) {
  console.log('Combining icon files into multi-resolution .ico...');
  console.log('Output file:', outputFile);
  
  const iconData = [];
  let totalSize = 0;
  
  // Read all input files
  for (const inputFile of inputFiles) {
    if (!fs.existsSync(inputFile)) {
      console.warn(`Warning: ${inputFile} not found, skipping...`);
      continue;
    }
    
    const data = fs.readFileSync(inputFile);
    console.log(`Reading: ${path.basename(inputFile)} (${data.length} bytes)`);
    
    // Read ICO header (first 6 bytes)
    if (data.length < 6) {
      console.warn(`Warning: ${inputFile} is too small, skipping...`);
      continue;
    }
    
    const reserved = data.readUInt16LE(0);
    const type = data.readUInt16LE(2);
    const count = data.readUInt16LE(4);
    
    if (reserved !== 0 || type !== 1) {
      console.warn(`Warning: ${inputFile} doesn't appear to be a valid ICO file, skipping...`);
      continue;
    }
    
    // Read each icon entry (16 bytes each)
    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + (i * 16);
      if (entryOffset + 16 > data.length) break;
      
      const width = data.readUInt8(entryOffset);
      const height = data.readUInt8(entryOffset + 1);
      const colorCount = data.readUInt8(entryOffset + 2);
      const reserved = data.readUInt8(entryOffset + 3);
      const planes = data.readUInt16LE(entryOffset + 4);
      const bitCount = data.readUInt16LE(entryOffset + 6);
      const imageSize = data.readUInt32LE(entryOffset + 8);
      const imageOffset = data.readUInt32LE(entryOffset + 12);
      
      const actualWidth = width === 0 ? 256 : width;
      const actualHeight = height === 0 ? 256 : height;
      
      // Extract image data
      const imageData = Buffer.from(data.slice(imageOffset, imageOffset + imageSize));
      
      iconData.push({
        width: actualWidth,
        height: actualHeight,
        colorCount,
        reserved,
        planes,
        bitCount,
        imageSize,
        imageData,
        source: path.basename(inputFile)
      });
      
      totalSize += imageSize;
      
      console.log(`  Entry ${i + 1}: ${actualWidth}x${actualHeight}, ${bitCount}bpp, ${imageSize} bytes`);
    }
  }
  
  if (iconData.length === 0) {
    console.error('Error: No valid icon entries found!');
    return false;
  }
  
  // Sort by size (largest to smallest for better compatibility)
  iconData.sort((a, b) => b.width - a.width);
  
  console.log(`\nTotal entries: ${iconData.length}`);
  console.log('Sizes included:', iconData.map(i => `${i.width}x${i.height}`).join(', '));
  
  // Create combined ICO file
  const headerSize = 6 + (iconData.length * 16);
  const outputBuffer = Buffer.alloc(headerSize + totalSize);
  
  // Write ICO header
  outputBuffer.writeUInt16LE(0, 0);  // Reserved
  outputBuffer.writeUInt16LE(1, 2);  // Type (1 = ICO)
  outputBuffer.writeUInt16LE(iconData.length, 4);  // Count
  
  // Write directory entries and image data
  let currentImageOffset = headerSize;
  
  for (let i = 0; i < iconData.length; i++) {
    const entry = iconData[i];
    const entryOffset = 6 + (i * 16);
    
    // Write directory entry
    outputBuffer.writeUInt8(entry.width === 256 ? 0 : entry.width, entryOffset);
    outputBuffer.writeUInt8(entry.height === 256 ? 0 : entry.height, entryOffset + 1);
    outputBuffer.writeUInt8(entry.colorCount, entryOffset + 2);
    outputBuffer.writeUInt8(entry.reserved, entryOffset + 3);
    outputBuffer.writeUInt16LE(entry.planes, entryOffset + 4);
    outputBuffer.writeUInt16LE(entry.bitCount, entryOffset + 6);
    outputBuffer.writeUInt32LE(entry.imageSize, entryOffset + 8);
    outputBuffer.writeUInt32LE(currentImageOffset, entryOffset + 12);
    
    // Copy image data
    entry.imageData.copy(outputBuffer, currentImageOffset);
    currentImageOffset += entry.imageSize;
  }
  
  // Write output file
  fs.writeFileSync(outputFile, outputBuffer);
  console.log(`\n✅ Successfully created: ${outputFile}`);
  console.log(`Total file size: ${outputBuffer.length} bytes`);
  
  return true;
}

// Main execution
const assetsDir = path.join(__dirname, '..', 'assets');
const inputFiles = [
  path.join(assetsDir, 'PURE PRESENTER-16x16.ico'),
  path.join(assetsDir, 'PURE PRESENTER-24x24.ico'),
  path.join(assetsDir, 'PURE PRESENTER-32x32.ico'),
  path.join(assetsDir, 'PURE PRESENTER-48x48.ico'),
  path.join(assetsDir, 'PURE PRESENTER-64x64.ico'),
  path.join(assetsDir, 'PURE PRESENTER-96x96.ico'),
  path.join(assetsDir, 'PURE PRESENTER-128x128.ico'),
  path.join(assetsDir, 'PURE PRESENTER-256x256.ico'),
];

const outputFile = path.join(assetsDir, 'PURE PRESENTER.ico');

combineIcons(inputFiles, outputFile);
