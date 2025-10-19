#!/bin/bash

echo "======================================"
echo "Handwriting OCR - Local Test Script"
echo "======================================"
echo ""

# Check if an image file was provided
if [ -z "$1" ]; then
    echo "Usage: ./test-local.sh <image-file>"
    echo "Example: ./test-local.sh test-image.jpg"
    exit 1
fi

IMAGE_FILE="$1"

# Check if file exists
if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: File '$IMAGE_FILE' not found"
    exit 1
fi

echo "Testing with image: $IMAGE_FILE"
echo ""

# Start local dev server in background
echo "Starting local dev server..."
npx wrangler dev --port 8787 &
DEV_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

echo ""
echo "Sending request..."
echo ""

# Test the endpoint
curl -X POST http://localhost:8787 \
  -F "image=@$IMAGE_FILE" \
  -s | jq '.'

# Kill the dev server
kill $DEV_PID

echo ""
echo "Test complete!"
