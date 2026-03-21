const DEFAULT_CAPTURE_SIZE = 24;

function getSharedCanvas(size) {
  if (typeof document === "undefined") {
    throw new Error("Face fingerprinting requires a browser document.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function normalizeVector(vector) {
  const average = vector.reduce((sum, value) => sum + value, 0) / vector.length;
  const centered = vector.map((value) => value - average);
  const magnitude = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0)) || 1;
  return centered.map((value) => Number((value / magnitude).toFixed(4)));
}

export function createFaceFingerprint(video, box, options = {}) {
  const captureSize = options.captureSize ?? DEFAULT_CAPTURE_SIZE;
  if (!video || !box) {
    return [];
  }

  const canvas = options.canvas ?? getSharedCanvas(captureSize);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return [];
  }

  canvas.width = captureSize;
  canvas.height = captureSize;

  ctx.clearRect(0, 0, captureSize, captureSize);
  ctx.filter = "grayscale(1) contrast(1.1)";
  ctx.drawImage(
    video,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    captureSize,
    captureSize
  );
  ctx.filter = "none";

  const imageData = ctx.getImageData(0, 0, captureSize, captureSize);
  const vector = [];

  for (let index = 0; index < imageData.data.length; index += 4) {
    vector.push(imageData.data[index] / 255);
  }

  return normalizeVector(vector);
}
