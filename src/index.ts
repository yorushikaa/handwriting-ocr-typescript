/**
 * Handwriting OCR Service for CJK, Arabic, and Cyrillic
 * Converts handwritten text to typed text with rotation-aware text overlay
 */

// ===== TYPE DEFINITIONS =====

interface Env {
  GOOGLE_API_KEY: string;
  ALLOWED_ORIGINS: string;
}

interface Vertex {
  x?: number;
  y?: number;
}

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

interface OCRResult {
  text: string;
  annotations: TextAnnotation[];
}

interface AnnotatedImage {
  type: string;
  svg: string;
  note: string;
}

interface ErrorResponse {
  error: string;
  stack?: string;
  success: false;
}

interface SuccessResponse {
  typed_text: string;
  annotated_image: AnnotatedImage;
  bounding_boxes: TextAnnotation[];
  success: true;
}

type APIResponse = SuccessResponse | ErrorResponse;

// ===== MAIN WORKER =====

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return jsonResponse(
        {
          error: 'Method not allowed. Use POST with image file.',
          success: false,
        },
        405
      );
    }

    try {
      // Parse form data
      const formData = await request.formData();
      const image = formData.get('image') as File | null;

      if (!image) {
        return jsonResponse(
          {
            error: 'No image provided. Send as form-data with key "image"',
            success: false,
          },
          400
        );
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

      console.log('Sending response with', result.annotations.length, 'annotations');
      console.log(
        'First annotation has angle?',
        result.annotations[0]?.angle !== undefined
      );

      return jsonResponse({
        typed_text: result.text,
        annotated_image: annotatedImage,
        bounding_boxes: result.annotations,
        success: true,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error:', err);
      return jsonResponse(
        {
          error: err.message,
          stack: err.stack,
          success: false,
        },
        500
      );
    }
  },
};

// ===== OCR FUNCTIONS =====

/**
 * Run OCR using Google Cloud Vision API
 */
async function runOCR(env: Env, imageBase64: string): Promise<OCRResult> {
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
          requests: [
            {
              image: {
                content: imageBase64,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    console.log('Google Vision Response:', JSON.stringify(data, null, 2));

    // Extract text from response
    const textAnnotations = data.responses[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return { text: '', annotations: [] };
    }

    // First annotation contains all detected text
    let text = textAnnotations[0].description || '';
    text = cleanOCROutput(text);

    // Skip first annotation (it's the combined text), rest are individual words/lines
    const annotations: TextAnnotation[] = textAnnotations.slice(1).map((annotation: any) => {
      const vertices: Vertex[] = annotation.boundingPoly.vertices;

      // Calculate rotation angle from the top edge (first two vertices)
      const v1 = vertices[0] || { x: 0, y: 0 };
      const v2 = vertices[1] || { x: 0, y: 0 };
      const angle = Math.atan2((v2.y || 0) - (v1.y || 0), (v2.x || 0) - (v1.x || 0)) * (180 / Math.PI);

      // Log rotation for debugging
      if (Math.abs(angle) > 5) {
        console.log(
          `📐 Rotated text detected: "${annotation.description}" - Angle: ${angle.toFixed(2)}°`
        );
      }

      // Calculate center point for rotation
      const centerX =
        vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length;
      const centerY =
        vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length;

      return {
        text: annotation.description,
        bounds: vertices,
        x: Math.min(...vertices.map((v) => v.x || 0)),
        y: Math.min(...vertices.map((v) => v.y || 0)),
        width:
          Math.max(...vertices.map((v) => v.x || 0)) -
          Math.min(...vertices.map((v) => v.x || 0)),
        height:
          Math.max(...vertices.map((v) => v.y || 0)) -
          Math.min(...vertices.map((v) => v.y || 0)),
        angle,
        centerX,
        centerY,
      };
    });

    return { text, annotations };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error:', err);
    throw new Error('OCR processing failed: ' + err.message);
  }
}

/**
 * Create annotated image with text overlay
 * Returns SVG markup that can be overlaid on the original image
 */
async function createAnnotatedImage(
  imageBase64: string,
  annotations: TextAnnotation[]
): Promise<AnnotatedImage> {
  // Debug: log first annotation to see structure
  if (annotations.length > 0) {
    console.log('Sample annotation:', JSON.stringify(annotations[0], null, 2));
  }

  // Create SVG with blur filter for background
  const filterDef = `<defs><filter id="blur"><feGaussianBlur in="SourceGraphic" stdDeviation="2"/></filter></defs>`;

  // First pass: render all blurred backgrounds (using polygons for rotation support)
  const backgrounds = annotations
    .map((annotation) => {
      const points = annotation.bounds
        .map((v) => `${v.x || 0},${v.y || 0}`)
        .join(' ');
      return `<polygon points="${points}" fill="white" fill-opacity="0.5" filter="url(#blur)"/>`;
    })
    .join('\n');

  // Second pass: render all borders (using polygons)
  const borders = annotations
    .map((annotation) => {
      const points = annotation.bounds
        .map((v) => `${v.x || 0},${v.y || 0}`)
        .join(' ');
      return `<polygon points="${points}" fill="none" stroke="rgba(100, 100, 100, 0.3)" stroke-width="1"/>`;
    })
    .join('\n');

  // Third pass: render all text with rotation (outlines first, then actual text)
  const textOutlines = annotations
    .map((annotation) => {
      // For rotated text, use width as the "height" for font sizing
      // Handle all orientations: 0°, ±90°, 180°, ±270°
      const angle = annotation.angle || 0;
      const absAngle = Math.abs(angle);

      // Text is rotated if angle is close to ±90° or ±270° (within 45° of vertical)
      const isVertical =
        (absAngle > 45 && absAngle < 135) || (absAngle > 225 && absAngle < 315);
      const effectiveHeight = isVertical ? annotation.width : annotation.height;
      const fontSize = Math.max(14, Math.min(effectiveHeight * 0.8, 100));

      const centerX = annotation.centerX || annotation.x;
      const centerY = annotation.centerY || annotation.y;
      const transform = `rotate(${angle}, ${centerX}, ${centerY})`;
      return `<text x="${centerX}" y="${
        centerY + fontSize / 3
      }" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round" text-anchor="middle" transform="${transform}">${escapeXml(
        annotation.text
      )}</text>`;
    })
    .join('\n');

  const texts = annotations
    .map((annotation) => {
      // For rotated text, use width as the "height" for font sizing
      // Handle all orientations: 0°, ±90°, 180°, ±270°
      const angle = annotation.angle || 0;
      const absAngle = Math.abs(angle);

      // Text is rotated if angle is close to ±90° or ±270° (within 45° of vertical)
      const isVertical =
        (absAngle > 45 && absAngle < 135) || (absAngle > 225 && absAngle < 315);
      const effectiveHeight = isVertical ? annotation.width : annotation.height;
      const fontSize = Math.max(14, Math.min(effectiveHeight * 0.8, 100));

      const centerX = annotation.centerX || annotation.x;
      const centerY = annotation.centerY || annotation.y;
      const transform = `rotate(${angle}, ${centerX}, ${centerY})`;
      return `<text x="${centerX}" y="${
        centerY + fontSize / 3
      }" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="black" text-anchor="middle" transform="${transform}">${escapeXml(
        annotation.text
      )}</text>`;
    })
    .join('\n');

  // Combine in layers: backgrounds -> borders -> text outlines -> text
  const svgElements = backgrounds + '\n' + borders + '\n' + textOutlines + '\n' + texts;

  // Return SVG markup that can be used to overlay on the image
  return {
    type: 'svg_overlay',
    svg: filterDef + svgElements,
    note: 'Render this SVG on top of the original image',
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Clean up OCR output
 */
function cleanOCROutput(text: string): string {
  return text.trim();
}

/**
 * Helper to create JSON responses with CORS
 */
function jsonResponse(data: APIResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
