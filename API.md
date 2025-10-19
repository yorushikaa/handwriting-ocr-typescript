# API Documentation

## Endpoint

```
POST https://your-worker.workers.dev
```

## Request

### Headers
```
Content-Type: multipart/form-data
```

### Body
Form data with single field:
- **image** (file): Image file containing handwritten text

### Supported Formats
- PNG
- JPG/JPEG
- Max size: ~10MB (Cloudflare Worker limit)

## Response

### Success Response

```json
{
  "typed_text": "手写的中文\n[EQUATION]\n更多内容",
  "success": true
}
```

**Fields:**
- `typed_text` (string): Typed text in original language with `[EQUATION]` markers
- `success` (boolean): Always `true` on success

### Error Response

```json
{
  "error": "Error message here",
  "success": false
}
```

**Fields:**
- `error` (string): Human-readable error message
- `success` (boolean): Always `false` on error

### HTTP Status Codes
- `200`: Success
- `400`: Bad request (missing image, invalid format)
- `405`: Method not allowed (use POST)
- `500`: Server error (OCR processing failed)

## Examples

### cURL

```bash
curl -X POST https://your-worker.workers.dev \
  -F "image=@handwriting.jpg"
```

### JavaScript (Fetch API)

```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('https://your-worker.workers.dev', {
  method: 'POST',
  body: formData
});

const data = await response.json();

if (data.success) {
  console.log('Result:', data.typed_text);
} else {
  console.error('Error:', data.error);
}
```

### Python (requests)

```python
import requests

with open('handwriting.jpg', 'rb') as f:
    files = {'image': f}
    response = requests.post(
        'https://your-worker.workers.dev',
        files=files
    )

result = response.json()
if result['success']:
    print('Result:', result['typed_text'])
```

### Node.js (node-fetch)

```javascript
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('image', fs.createReadStream('handwriting.jpg'));

const response = await fetch('https://your-worker.workers.dev', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data.typed_text);
```

## Output Format

### Text Markers

The service uses special markers for non-text content:

- `[EQUATION]` - Mathematical equation or formula
- `[IMAGE]` - Diagram, chart, or figure

### Example Output

**Input Image:**
```
这是能量公式    (handwritten Chinese)
E = mc²         (equation)
质量和能量      (handwritten Chinese)
[diagram]       (image)
更多内容        (handwritten Chinese)
```

**Output:**
```
这是能量公式
[EQUATION]
质量和能量
[IMAGE]
更多内容
```

## Supported Languages

- 🇨🇳 Chinese (Simplified & Traditional)
- 🇯🇵 Japanese (Hiragana, Katakana, Kanji)
- 🇰🇷 Korean (Hangul)
- 🇸🇦 Arabic
- 🇷🇺 Russian / Cyrillic
- 🌍 Other scripts may work but are not officially supported

## Integration with Mathpix

This service is designed to work **before** Mathpix:

```
1. User uploads handwritten document
   ↓
2. Your Service: Handwritten → Typed text + [EQUATION] markers
   ↓
3. Mathpix: Process typed text (can read typed CJK/Arabic/Cyrillic) + equations
   ↓
4. Final output: Complete document
```

**Why this works:**
- Mathpix can read **typed** CJK/Arabic/Cyrillic characters
- Mathpix excels at processing mathematical equations
- Your service converts **handwritten** text to **typed** text
- Together, they handle the complete document

## Rate Limits

**Free Tier:**
- 10,000 requests/day
- No hard rate limit per second

**Paid Tier:**
- $0.011 per 1,000 requests
- Unlimited requests

## Best Practices

### Image Quality
- Use high-resolution images (300+ DPI recommended)
- Ensure good lighting and contrast
- Avoid blurry or low-quality images

### Performance
- Images under 2MB process fastest
- Compress large images before uploading
- Use JPEG for photos, PNG for scanned documents

### Error Handling
Always check the `success` field:

```javascript
const response = await fetch(...);
const data = await response.json();

if (!data.success) {
  // Handle error
  console.error(data.error);
  return;
}

// Process result
processText(data.typed_text);
```

## CORS

CORS is enabled for all origins (`*`). You can call this API from any website or application.

## Privacy

- Images are processed in Cloudflare Workers AI
- Images are not stored or logged
- Cloudflare may retain data according to their privacy policy
- For sensitive documents, consider self-hosting

## Support

For issues or questions:
1. Check the logs: `npx wrangler tail`
2. Review `DEPLOYMENT.md` for troubleshooting
3. Test with `test.html` to isolate issues
