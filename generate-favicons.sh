#!/bin/bash

# Generate favicons from SVG using ImageMagick or rsvg-convert
# This script creates all necessary favicon sizes from the SVG source

echo "🎨 Generating favicons from SVG..."

# Check if required tools are installed
if ! command -v convert &> /dev/null && ! command -v rsvg-convert &> /dev/null; then
    echo "❌ Error: ImageMagick or librsvg is required but not installed."
    echo "Install with:"
    echo "  macOS: brew install imagemagick librsvg"
    echo "  Ubuntu: sudo apt-get install imagemagick librsvg2-bin"
    exit 1
fi

# Create public directory if it doesn't exist
mkdir -p public

# Function to convert SVG to PNG
convert_svg_to_png() {
    local size=$1
    local output=$2
    
    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w $size -h $size public/favicon.svg > "public/$output"
    elif command -v convert &> /dev/null; then
        convert -background none -resize ${size}x${size} public/favicon.svg "public/$output"
    fi
    
    echo "✅ Generated $output (${size}x${size})"
}

# Generate standard favicon sizes
convert_svg_to_png 16 "favicon-16x16.png"
convert_svg_to_png 32 "favicon-32x32.png"
convert_svg_to_png 48 "favicon-48x48.png"
convert_svg_to_png 64 "favicon-64x64.png"
convert_svg_to_png 128 "favicon-128x128.png"
convert_svg_to_png 192 "favicon-192x192.png"
convert_svg_to_png 512 "favicon-512x512.png"

# Generate Apple Touch Icons
convert_svg_to_png 180 "apple-touch-icon.png"
convert_svg_to_png 152 "favicon-152x152.png"
convert_svg_to_png 144 "favicon-144x144.png"
convert_svg_to_png 120 "favicon-120x120.png"
convert_svg_to_png 114 "favicon-114x114.png"
convert_svg_to_png 76 "favicon-76x76.png"
convert_svg_to_png 72 "favicon-72x72.png"
convert_svg_to_png 60 "favicon-60x60.png"
convert_svg_to_png 57 "favicon-57x57.png"

# Generate Microsoft Tile Icons
convert_svg_to_png 70 "favicon-70x70.png"
convert_svg_to_png 150 "favicon-150x150.png"
convert_svg_to_png 310 "favicon-310x310.png"

# Generate wide tile (310x150)
if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 310 -h 150 public/favicon.svg > "public/favicon-310x150.png"
elif command -v convert &> /dev/null; then
    convert -background none -resize 310x150 -gravity center -extent 310x150 public/favicon.svg "public/favicon-310x150.png"
fi
echo "✅ Generated favicon-310x150.png (310x150)"

# Generate favicon.ico with multiple sizes
if command -v convert &> /dev/null; then
    convert public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon.ico
    echo "✅ Generated favicon.ico (multi-resolution)"
else
    echo "⚠️  Skipping favicon.ico generation (requires ImageMagick)"
fi

echo ""
echo "🎉 Favicon generation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Check the generated files in the public/ directory"
echo "2. Commit the changes to git"
echo "3. Test in different browsers"
echo ""
echo "💡 Tips:"
echo "- Clear browser cache to see new favicons"
echo "- Test on real devices for best results"
echo "- Use online favicon checker tools to verify"

# Make script executable
chmod +x generate-favicons.sh
