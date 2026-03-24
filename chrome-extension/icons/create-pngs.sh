#!/bin/bash
# Generate SilkWeb icon PNGs from the HTML generator
# Option 1: Use this script with a headless browser
# Option 2: Open generate-icons.html in Chrome and click the button
# Option 3: Use ImageMagick (if installed):

# Using ImageMagick to create simple purple web icons
for size in 16 48 128; do
  convert -size ${size}x${size} xc:transparent \
    -fill none -stroke '#6366f1' -strokewidth $((size/30 > 0 ? size/30 : 1)) \
    -draw "circle $((size/2)),$((size/2)) $((size/2)),$((size/10))" \
    -draw "line $((size/2)),0 $((size/2)),$size" \
    -draw "line 0,$((size/2)) $size,$((size/2))" \
    -draw "line $((size/8)),$((size/8)) $((size*7/8)),$((size*7/8))" \
    -draw "line $((size*7/8)),$((size/8)) $((size/8)),$((size*7/8))" \
    -fill '#6366f1' -draw "circle $((size/2)),$((size/2)) $((size/2+size/12)),$((size/2))" \
    "icon${size}.png"
  echo "Created icon${size}.png"
done

echo "Done! Icons created."
