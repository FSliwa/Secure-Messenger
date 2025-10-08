// Generate favicon PNG files from SVG using sharp
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 64, 128, 192, 256, 512];
const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const outputDir = path.join(__dirname, 'public');

async function generateFavicons() {
  console.log('Generating favicons from SVG...');
  
  // Read SVG content
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Generate PNG files for each size
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `favicon-${size}x${size}.png`);
    
    try {
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${size}x${size} favicon`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message);
    }
  }
  
  // Generate apple-touch-icon (180x180)
  try {
    await sharp(Buffer.from(svgContent))
      .resize(180, 180)
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('✗ Failed to generate apple-touch-icon:', error.message);
  }
  
  console.log('\nAll favicons generated successfully!');
}

generateFavicons().catch(console.error);