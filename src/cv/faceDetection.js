let sharedDetector = null;

function getFaceDetector() {
  if (sharedDetector !== null) {
    return sharedDetector;
  }

  if (typeof window === "undefined" || !("FaceDetector" in window)) {
    sharedDetector = null;
    return sharedDetector;
  }

  try {
    sharedDetector = new window.FaceDetector({
      fastMode: true,
      maxDetectedFaces: 1,
    });
  } catch {
    sharedDetector = null;
  }

  return sharedDetector;
}

function clampBox(box, maxWidth, maxHeight) {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const width = Math.max(0, Math.min(box.width, maxWidth - x));
  const height = Math.max(0, Math.min(box.height, maxHeight - y));

  if (!width || !height) {
    return null;
  }

  return { x, y, width, height };
}

function createFallbackBox(sourceWidth, sourceHeight) {
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const width = sourceWidth * 0.34;
  const height = sourceHeight * 0.46;
  const x = (sourceWidth - width) / 2;
  const y = (sourceHeight - height) / 2;

  return clampBox({ x, y, width, height }, sourceWidth, sourceHeight);
}

export async function detectFace(video, options = {}) {
  const {
    allowFallback = true,
    sourceWidth = video?.videoWidth ?? video?.width ?? 0,
    sourceHeight = video?.videoHeight ?? video?.height ?? 0,
  } = options;

  if (!video || !sourceWidth || !sourceHeight) {
    return null;
  }

  const detector = getFaceDetector();
  if (!detector) {
    return allowFallback ? createFallbackBox(sourceWidth, sourceHeight) : null;
  }

  try {
    const faces = await detector.detect(video);
    const face = faces?.[0]?.boundingBox;
    if (!face) {
      return null;
    }
    return clampBox(face, sourceWidth, sourceHeight);
  } catch {
    return allowFallback ? createFallbackBox(sourceWidth, sourceHeight) : null;
  }
}

export function isFaceDetectionSupported() {
  return typeof window !== "undefined" && "FaceDetector" in window;
}
