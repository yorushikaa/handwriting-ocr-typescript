# Deployment Guide

## Prerequisites
- Node.js installed (v18 or higher)
- Cloudflare account (free tier works)

## Step 1: Install Dependencies

```bash
cd handwriting-ocr-service
npm install
```

## Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

After deployment, you'll see output like:
```
Published handwriting-ocr (X.XX sec)
  https://handwriting-ocr.<your-subdomain>.workers.dev
```

**Copy this URL!** You'll need it for testing.

## Step 4: Test Your Deployment

### Option A: Use the Test Interface

1. Open `test.html` in your browser (you can just double-click it)
2. Paste your worker URL in the input box
3. Upload a test image with handwritten text
4. Click "Process Handwriting"

### Option B: Use cURL

```bash
curl -X POST https://handwriting-ocr.<your-subdomain>.workers.dev \
  -F "image=@test-image.jpg"
```

Expected response:
```json
{
  "typed_text": "手写的文字\n[EQUATION]\n更多内容",
  "success": true
}
```

## Step 5: Local Development (Optional)

To test locally before deploying:

```bash
npx wrangler dev
```

This starts a local server at `http://localhost:8787`

## Troubleshooting

### Error: "AI binding not found"

Make sure your `wrangler.toml` has:
```toml
[ai]
binding = "AI"
```

### Error: "Workers AI is not enabled"

1. Go to Cloudflare dashboard
2. Select your account
3. Go to Workers & Pages
4. Enable Workers AI (it's free for first 10,000 requests/day)

### Error: "Image too large"

Cloudflare Workers have a 100MB request size limit. Compress your images if needed.

## Cost

- **Free tier:** 10,000 requests/day
- **After free tier:** $0.011 per 1,000 requests
- **Example:** 100,000 requests/month = ~$1.10

## Next Steps

### Integration Example

```javascript
// In your application
async function processHandwriting(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('https://your-worker.workers.dev', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (result.success) {
    console.log('Typed text:', result.typed_text);
    // Now send to Mathpix for further processing
    return result.typed_text;
  }
}
```

### Custom Domain (Optional)

To use your own domain:

1. Add a route in `wrangler.toml`:
```toml
routes = [
  { pattern = "ocr.yourdomain.com", custom_domain = true }
]
```

2. Deploy again:
```bash
npx wrangler deploy
```

## Monitoring

View logs in real-time:
```bash
npx wrangler tail
```

## Updating

To update your worker:

1. Make changes to `src/index.js`
2. Deploy again:
```bash
npx wrangler deploy
```

That's it! Your handwriting OCR service is now live.
