#!/bin/bash
# Regenerate sounds.json manifest from available MP3 files
# Run this script whenever you add or remove sound files
#
# Usage: ./update-sounds.sh

cd "$(dirname "$0")"

OUTPUT_FILE="sounds.json"

# Build the JSON content
{
    echo "{"
    
    # Success sounds
    echo '  "correct": ['
    first=true
    for f in sounds/success/*.mp3; do
        if [ -f "$f" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            printf '    "%s"' "$f"
        fi
    done
    echo ""
    echo "  ],"
    
    # Fail sounds
    echo '  "wrong": ['
    first=true
    for f in sounds/fail/*.mp3; do
        if [ -f "$f" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            printf '    "%s"' "$f"
        fi
    done
    echo ""
    echo "  ]"
    
    echo "}"
} > "$OUTPUT_FILE"

# Count and report
correct_count=$(ls -1 sounds/success/*.mp3 2>/dev/null | wc -l | tr -d ' ')
wrong_count=$(ls -1 sounds/fail/*.mp3 2>/dev/null | wc -l | tr -d ' ')

echo "✅ Updated $OUTPUT_FILE"
echo "   - Success sounds: $correct_count"
echo "   - Fail sounds: $wrong_count"
