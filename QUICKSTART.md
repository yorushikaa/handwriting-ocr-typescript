# 🚀 Quick Start (5 Minutes)

## What You're Building
A Cloudflare Worker that converts handwritten CJK/Arabic/Cyrillic text to typed text with equation markers.

## Ultra-Fast Setup

### 1. Install Wrangler
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Install Dependencies
```bash
cd handwriting-ocr-service
npm install
```

### 4. Deploy
```bash
npx wrangler deploy
```

**You'll get a URL like:** `https://handwriting-ocr.your-name.workers.dev`

### 5. Test It

Open `test.html` in your browser:
```bash
# macOS/Linux
open test.html

# Windows
start test.html
```

1. Paste your worker URL
2. Upload a handwritten image
3. Get typed text!

## Done! 🎉

Your handwriting OCR service is live and ready to use.

---

## What to Test With

### Good Test Images:
- Handwritten notes in Chinese characters
- Arabic handwritten text
- Russian/Cyrillic handwriting
- Mixed text with math equations

### Where to Get Test Images:
1. Take a photo of your own handwriting
2. Draw text in MS Paint / any drawing app
3. Use online handwriting samples

### Example Test:
```bash
curl -X POST https://your-worker.workers.dev \
  -F "image=@my-handwriting.jpg"
```

Expected output:
```json
{
  "typed_text": "你好世界\n[EQUATION]\n这是测试",
  "success": true
}
```

---

## Troubleshooting

**"Command not found: wrangler"**
```bash
npm install -g wrangler
```

**"AI binding not found"**
- Workers AI might not be enabled
- Go to Cloudflare dashboard → Workers & Pages → Enable Workers AI

**"No response from worker"**
- Check if deployment succeeded
- Run `npx wrangler tail` to see logs

---

## Next: Integration

Use this in your Chrome extension or app:

```javascript
const formData = new FormData();
formData.append('image', imageBlob);

const response = await fetch('https://your-worker.workers.dev', {
  method: 'POST',
  body: formData
});

const { typed_text } = await response.json();
console.log(typed_text); // "手写文字\n[EQUATION]\n更多内容"
```

That's it! You now have a production-ready handwriting OCR service running on Cloudflare's edge network.
