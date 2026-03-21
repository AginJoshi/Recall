export const DEFAULT_FACE_MATCH_THRESHOLD = 0.18;

export function descriptorDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const delta = a[index] - b[index];
    sum += delta * delta;
  }

  return Math.sqrt(sum / a.length);
}

export function matchFace(descriptor, profiles = [], options = {}) {
  const threshold = options.threshold ?? DEFAULT_FACE_MATCH_THRESHOLD;
  if (!Array.isArray(descriptor) || !descriptor.length) {
    return {
      profile: null,
      confidence: 0,
      distance: Number.POSITIVE_INFINITY,
      matched: false,
    };
  }

  let bestProfile = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const profile of profiles) {
    const distance = descriptorDistance(descriptor, profile?.faceDescriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestProfile = profile;
    }
  }

  const matched = Boolean(bestProfile) && bestDistance < threshold;
  const confidence = matched ? Math.max(0, 1 - bestDistance / threshold) : 0;

  return {
    profile: matched ? bestProfile : null,
    confidence,
    distance: bestDistance,
    matched,
  };
}
