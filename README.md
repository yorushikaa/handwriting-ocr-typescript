# Handwriting OCR Service for CJK/Arabic/Cyrillic

## Purpose
Convert handwritten text in Chinese, Japanese, Korean, Arabic, and Cyrillic scripts to typed text.
Designed to complement Mathpix by handling handwritten text in languages they don't support well.

## What it does
- **Input:** Image with handwritten text (CJK/Arabic/Cyrillic) + equations
- **Output:** Typed text in original language with `[EQUATION]` markers for math expressions

## Example IMPORTANT!!!

**Input Image:**
```
手写的中文文字 (handwritten) E = mc² 更多文字 (handwritten)

```

**Output:**
```
手写的中文文字 (print)
[EQUATION]
更多文字 (print)
```

## Architecture
- Cloudflare Worker (edge compute)
- Cloudflare Workers AI (vision model for OCR)
- Supports: Chinese, Japanese, Korean, Arabic, Russian/Cyrillic

## Deployment

### Quick Start
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy
```

### API Usage
```bash
curl -X POST https://your-worker.workers.dev \
  -F "image=@handwriting.jpg"
```

**Response:**
```json
{
  "typed_text": "手写的文字\n[EQUATION]\n更多内容",
  "success": true
}
```

## Integration with Mathpix

1. User uploads handwritten document
2. Your service: Handwritten → Typed text + `[EQUATION]` markers
3. Mathpix: Process typed text (they can read typed CJK/Arabic/Cyrillic) + equations
4. Final output: Complete document with all text and equations processed

## Cost
- Cloudflare Workers AI: Free tier 10,000 requests/day
- After free tier: $0.011 per 1,000 requests

## Testing
See `test.html` for a simple web interface to test the service.
