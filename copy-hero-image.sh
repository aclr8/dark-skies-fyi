#!/bin/bash
# Copies the hero sky image from the user's desktop wallpaper or Downloads
# to public/hero-sky.png. Run from project root.

DEST="public/hero-sky.png"

# Candidate sources in priority order
CANDIDATES=(
  "$HOME/Downloads/hero-sky.png"
  "$HOME/Desktop/hero-sky.png"
  "$HOME/Pictures/hero-sky.png"
)

for SRC in "${CANDIDATES[@]}"; do
  if [ -f "$SRC" ]; then
    cp "$SRC" "$DEST"
    echo "Copied $SRC → $DEST"
    exit 0
  fi
done

# Try to grab current desktop wallpaper on macOS
if command -v osascript &>/dev/null; then
  WALLPAPER=$(osascript -e 'tell app "System Events" to get picture of current desktop')
  if [ -f "$WALLPAPER" ]; then
    cp "$WALLPAPER" "$DEST"
    echo "Copied desktop wallpaper $WALLPAPER → $DEST"
    exit 0
  fi
fi

echo "hero-sky.png not found in any expected location."
echo "Please manually copy a dark-sky night photo to: $(pwd)/$DEST"
exit 1
