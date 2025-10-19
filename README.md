# Handwriting OCR Service for CJK/Arabic/Cyrillic

A TypeScript-based Cloudflare Worker that converts handwritten text images to typed text with rotation-aware text overlay.

## Features
- **Multi-language OCR**: Chinese, Japanese, Korean, Arabic, and Cyrillic scripts
- **Rotation-aware**: Correctly handles images rotated at any angle (0°, ±90°, 180°, ±270°)
- **SVG Overlay**: Returns SVG markup with typed text positioned over handwriting
- **Google Vision API**: Uses DOCUMENT_TEXT_DETECTION for high-quality OCR
- **TypeScript**: Full type safety with comprehensive type definitions

## What it does
- **Input:** Image with handwritten text (any orientation)
- **Output:**
  - Typed text extracted from image
  - SVG overlay with rotation-aware text positioning
  - Bounding box coordinates for each text segment

## Architecture
- **Platform:** Cloudflare Worker (TypeScript)
- **OCR Engine:** Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
- **Features:** CORS enabled, rotation detection, SVG generation

## Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Set up Google Cloud Vision API key
# Get key from: https://console.cloud.google.com/apis/credentials
# Add to .dev.vars file:
echo "GOOGLE_API_KEY=your_api_key_here" > .dev.vars
```

### Local Development
```bash
# Run development server
npx wrangler dev --local

# Server runs at http://localhost:8787
```

### Deployment
```bash
# Set production API key
npx wrangler secret put GOOGLE_API_KEY

# Deploy to Cloudflare
npx wrangler deploy
```

## API Usage

### Request
```bash
curl -X POST http://localhost:8787 \
  -F "image=@handwriting.jpg"
```

### Response
```json
{
  "typed_text": "手写的文字",
  "annotated_image": {
    "type": "svg_overlay",
    "svg": "<defs>...</defs><polygon>...</polygon><text>...</text>",
    "note": "Render this SVG on top of the original image"
  },
  "bounding_boxes": [
    {
      "text": "手写",
      "bounds": [{"x": 100, "y": 200}, ...],
      "x": 100,
      "y": 200,
      "width": 50,
      "height": 30,
      "angle": 0,
      "centerX": 125,
      "centerY": 215
    }
  ],
  "success": true
}
```

## TypeScript Types

### Key Interfaces
```typescript
interface TextAnnotation {
  text: string;
  bounds: Vertex[];
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  centerX: number;
  centerY: number;
}

interface SuccessResponse {
  typed_text: string;
  annotated_image: AnnotatedImage;
  bounding_boxes: TextAnnotation[];
  success: true;
}
```

See `src/index.ts` for complete type definitions.

## Rotation Handling

The service automatically detects text rotation from bounding polygons:
- Calculates angle using `Math.atan2()` from vertex coordinates
- Applies SVG `transform="rotate(angle, centerX, centerY)"` to text elements
- Uses orientation-aware font sizing (width for vertical, height for horizontal)
- Supports all angles: 0°, ±90°, 180°, ±270°, and everything in between

## Testing
Open `test.html` in a browser and point it to `http://localhost:8787` to test with your own images.

## Cost
- Google Cloud Vision API: Pay per use
- Cloudflare Workers: Free tier available, then pay per request
