// Generate favicons from SVG
// This script creates PNG favicons in various sizes from the SVG favicon

const fs = require('fs');
const path = require('path');

// Create a simple HTML file that can be used to manually generate PNGs
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Favicon Generator</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: #f0f0f0;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .favicon-preview {
            display: inline-block;
            margin: 10px;
            text-align: center;
            background: #fff;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .favicon-preview canvas {
            border: 1px solid #eee;
            display: block;
            margin: 0 auto 10px;
        }
        button {
            background: #1877F2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #166FE5;
        }
        .instructions {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>SecureChat Favicon Generator</h1>
        
        <div class="instructions">
            <h3>Instructions:</h3>
            <ol>
                <li>Open this file in a web browser</li>
                <li>Click each "Download" button to save the PNG files</li>
                <li>Save them in the <code>public/</code> directory</li>
                <li>The favicon.ico will need to be created separately using an online converter</li>
            </ol>
        </div>

        <div id="previews"></div>

        <script>
            const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
            const svgContent = \`${fs.readFileSync(path.join(__dirname, 'public', 'favicon.svg'), 'utf8').replace(/`/g, '\\`')}\`;
            
            const container = document.getElementById('previews');
            
            sizes.forEach(size => {
                const preview = document.createElement('div');
                preview.className = 'favicon-preview';
                
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                
                const ctx = canvas.getContext('2d');
                
                // Create image from SVG
                const img = new Image();
                const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, size, size);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
                
                const label = document.createElement('div');
                label.textContent = \`\${size}x\${size}\`;
                
                const button = document.createElement('button');
                button.textContent = 'Download';
                button.onclick = function() {
                    canvas.toBlob(function(blob) {
                        const link = document.createElement('a');
                        link.download = size === 180 ? 'apple-touch-icon.png' : \`favicon-\${size}x\${size}.png\`;
                        link.href = URL.createObjectURL(blob);
                        link.click();
                    });
                };
                
                preview.appendChild(canvas);
                preview.appendChild(label);
                preview.appendChild(button);
                container.appendChild(preview);
            });
        </script>
    </div>
</body>
</html>
`;

// Save the HTML file
fs.writeFileSync(path.join(__dirname, 'public', 'generate-favicons.html'), htmlContent);

console.log('✅ Created generate-favicons.html');
console.log('📝 Open public/generate-favicons.html in a browser to generate PNG favicons');
console.log('💡 After generating PNGs, use an online tool to create favicon.ico from the 16x16, 32x32, and 48x48 PNGs');
