// Create a temporary favicon.ico file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base64 encoded simple favicon (16x16 blue square with white "S")
const faviconBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/wAAAP8AAAD/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8AAAD/AAAA/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/AAAA/wAAAP8YePL/GHjy/xh48v//////GHjy/xh48v8YePL/GHjy/xh48v8YePL//////xh48v8YePL/GHjy/wAAAP8AAAD/GHjy/xh48v8YePL//////xh48v8YePL/GHjy/xh48v8YePL/GHjy//////8YePL/GHjy/xh48v8AAAD/AAAA/xh48v8YePL/GHjy/////////////////xh48v8YePL/////////////////GHjy/xh48v8YePL/AAAA/wAAAP8YePL/GHjy/xh48v//////////////////////GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/wAAAP8AAAD/GHjy/xh48v8YePL/GHjy//////////////////////8YePL/GHjy/xh48v8YePL/GHjy/xh48v8AAAD/AAAA/xh48v8YePL/GHjy/xh48v8YePL/////////////////GHjy/xh48v8YePL/GHjy/xh48v8YePL/AAAA/wAAAP8YePL/GHjy/xh48v8YePL/GHjy/xh48v//////GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/wAAAP8AAAD/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8AAAD/AAAA/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/GHjy/xh48v8YePL/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

// Convert base64 to buffer and save as favicon.ico
const faviconBuffer = Buffer.from(faviconBase64, 'base64');
const faviconPath = path.join(__dirname, 'public', 'favicon.ico');

fs.writeFileSync(faviconPath, faviconBuffer);

console.log('✅ Created temporary favicon.ico');
console.log('📍 Location: public/favicon.ico');
console.log('ℹ️  This is a placeholder. Generate a proper favicon.ico from the SVG for production.');
