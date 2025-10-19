/**
 * Handwriting OCR Service for CJK, Arabic, and Cyrillic
 * Converts handwritten text to typed text with equation markers
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return jsonResponse({
        error: 'Method not allowed. Use POST with image file.',
        success: false
      }, 405);
    }

    try {
      // Parse form data
      const formData = await request.formData();
      const image = formData.get('image');

      if (!image) {
        return jsonResponse({
          error: 'No image provided. Send as form-data with key "image"',
          success: false
        }, 400);
      }

      console.log('Processing image:', image.name, image.type);

      // Convert image to base64
      const arrayBuffer = await image.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert to base64 without stack overflow
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      console.log('Image converted to base64, size:', base64.length);

      // Call Google Vision API and get text + coordinates
      const result = await runOCR(env, base64);

      console.log('OCR complete');

      // Create annotated image with typed text overlay
      const annotatedImage = await createAnnotatedImage(base64, result.annotations);

      return jsonResponse({
        typed_text: result.text,
        annotated_image: annotatedImage, // Base64 encoded image with text overlay
        bounding_boxes: result.annotations, // Coordinates for custom rendering
        success: true
      });

    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({
        error: error.message,
        stack: error.stack,
        success: false
      }, 500);
    }
  }
};

/**
 * Run OCR using Google Cloud Vision API
 */
async function runOCR(env, imageBase64) {
  try {
    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: imageBase64
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION', // Better for dense text and handwriting
                maxResults: 1
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Google Vision Response:', data);

    // Extract text from response
    const textAnnotations = data.responses[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return { text: '', annotations: [] }; // No text detected
    }

    // First annotation contains all detected text
    let text = textAnnotations[0].description || '';
    text = cleanOCROutput(text);

    // Skip first annotation (it's the combined text), rest are individual words/lines
    const annotations = textAnnotations.slice(1).map(annotation => ({
      text: annotation.description,
      bounds: annotation.boundingPoly.vertices,
      // Calculate bounding box for easier use
      x: Math.min(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
      y: Math.min(...annotation.boundingPoly.vertices.map(v => v.y || 0)),
      width: Math.max(...annotation.boundingPoly.vertices.map(v => v.x || 0)) -
             Math.min(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
      height: Math.max(...annotation.boundingPoly.vertices.map(v => v.y || 0)) -
              Math.min(...annotation.boundingPoly.vertices.map(v => v.y || 0))
    }));

    return { text, annotations };

  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('OCR processing failed: ' + error.message);
  }
}

/**
 * Create annotated image with text overlay
 * Returns SVG markup that can be overlaid on the original image
 */
async function createAnnotatedImage(imageBase64, annotations) {
  // Create SVG with blur filter for background
  const filterDef = `<defs><filter id="blur"><feGaussianBlur in="SourceGraphic" stdDeviation="2"/></filter></defs>`;

  // First pass: render all blurred backgrounds
  const backgrounds = annotations.map(annotation => {
    return `<rect x="${annotation.x}" y="${annotation.y}" width="${annotation.width}" height="${annotation.height}" fill="white" fill-opacity="0.5" filter="url(#blur)"/>`;
  }).join('\n');

  // Second pass: render all borders
  const borders = annotations.map(annotation => {
    return `<rect x="${annotation.x}" y="${annotation.y}" width="${annotation.width}" height="${annotation.height}" fill="none" stroke="rgba(100, 100, 100, 0.3)" stroke-width="1"/>`;
  }).join('\n');

  // Third pass: render all text (outlines first, then actual text)
  const textOutlines = annotations.map(annotation => {
    return `<text x="${annotation.x + 2}" y="${annotation.y + annotation.height - 2}" font-family="Arial, sans-serif" font-size="${Math.max(12, annotation.height * 0.7)}" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round">${escapeXml(annotation.text)}</text>`;
  }).join('\n');

  const texts = annotations.map(annotation => {
    return `<text x="${annotation.x + 2}" y="${annotation.y + annotation.height - 2}" font-family="Arial, sans-serif" font-size="${Math.max(12, annotation.height * 0.7)}" fill="black">${escapeXml(annotation.text)}</text>`;
  }).join('\n');

  // Combine in layers: backgrounds -> borders -> text outlines -> text
  const svgElements = backgrounds + '\n' + borders + '\n' + textOutlines + '\n' + texts;

  // Return SVG markup that can be used to overlay on the image
  return {
    type: 'svg_overlay',
    svg: filterDef + svgElements,
    note: 'Render this SVG on top of the original image'
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

/**
 * Clean up OCR output
 */
function cleanOCROutput(text) {
  // Just trim whitespace, keep everything else as-is
  return text.trim();
}

/**
 * Helper to create JSON responses with CORS
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
