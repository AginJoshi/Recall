const STORAGE_KEY = "recallcam-profiles-v1";
const FACE_MATCH_THRESHOLD = 0.18;
const DETECTION_INTERVAL_MS = 1200;

const elements = {
  video: document.getElementById("camera"),
  overlay: document.getElementById("overlay"),
  faceCapture: document.getElementById("face-capture"),
  cameraStatus: document.getElementById("camera-status"),
  speechStatus: document.getElementById("speech-status"),
  profileName: document.getElementById("profile-name"),
  profileSummary: document.getElementById("profile-summary"),
  transcriptOutput: document.getElementById("transcript-output"),
  featureWarning: document.getElementById("feature-warning"),
  startCamera: document.getElementById("start-camera"),
  toggleListening: document.getElementById("toggle-listening"),
  saveProfile: document.getElementById("save-profile"),
  resetMemory: document.getElementById("reset-memory"),
  factName: document.getElementById("fact-name"),
  factRole: document.getElementById("fact-role"),
  factCompany: document.getElementById("fact-company"),
  factInterests: document.getElementById("fact-interests"),
  factGoals: document.getElementById("fact-goals"),
  factLastSeen: document.getElementById("fact-last-seen"),
  factNotes: document.getElementById("fact-notes"),
  knownProfiles: document.getElementById("known-profiles"),
};

const state = {
  stream: null,
  isListening: false,
  recognition: null,
  transcript: "",
  detector: null,
  detectTimer: null,
  profileStore: loadProfiles(),
  activeProfile: null,
  lastDescriptor: null,
  lastFaceBox: null,
  facePresent: false,
};

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profileStore));
}

function setStatus(element, text, cls) {
  element.textContent = text;
  element.className = `status-pill ${cls}`;
}

function setWarning(message = "") {
  elements.featureWarning.textContent = message;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function renderKnownProfiles() {
  const profiles = [...state.profileStore].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));

  if (!profiles.length) {
    elements.knownProfiles.innerHTML = '<p class="empty-state">No profiles saved yet.</p>';
    return;
  }

  elements.knownProfiles.innerHTML = profiles
    .map((profile) => {
      const summary = buildSummary(profile);
      return `
        <article class="known-profile">
          <strong>${escapeHtml(profile.name || "Unknown person")}</strong>
          <span>${escapeHtml(summary)}</span>
          <span>Last seen ${escapeHtml(formatDate(profile.lastSeen))}</span>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSummary(profile) {
  const parts = [];
  if (profile.role) parts.push(profile.role);
  if (profile.company) parts.push(`at ${profile.company}`);
  if (profile.interests?.length) parts.push(`likes ${profile.interests.join(", ")}`);
  if (profile.goals?.length) parts.push(`focused on ${profile.goals.join(", ")}`);
  if (!parts.length && profile.notes) parts.push(profile.notes);
  return parts.join(" • ") || "No remembered facts yet.";
}

function renderProfile(profile) {
  if (!profile) {
    elements.profileName.textContent = "Waiting for a face...";
    elements.profileSummary.textContent =
      "When someone steps into frame, their remembered details will appear here.";
    elements.factName.textContent = "Unknown";
    elements.factRole.textContent = "-";
    elements.factCompany.textContent = "-";
    elements.factInterests.textContent = "-";
    elements.factGoals.textContent = "-";
    elements.factLastSeen.textContent = "-";
    elements.factNotes.textContent = "No notes yet.";
    elements.saveProfile.disabled = !state.lastDescriptor;
    return;
  }

  elements.profileName.textContent = profile.name || "Unknown person";
  elements.profileSummary.textContent = buildSummary(profile);
  elements.factName.textContent = profile.name || "Unknown";
  elements.factRole.textContent = profile.role || "-";
  elements.factCompany.textContent = profile.company || "-";
  elements.factInterests.textContent = profile.interests?.join(", ") || "-";
  elements.factGoals.textContent = profile.goals?.join(", ") || "-";
  elements.factLastSeen.textContent = formatDate(profile.lastSeen);
  elements.factNotes.textContent = profile.notes || "No notes yet.";
  elements.saveProfile.disabled = !state.lastDescriptor;
}

function drawOverlay() {
  const { overlay, video } = elements;
  const ctx = overlay.getContext("2d");
  overlay.width = video.videoWidth || overlay.clientWidth;
  overlay.height = video.videoHeight || overlay.clientHeight;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (!state.lastFaceBox) return;

  const { x, y, width, height } = state.lastFaceBox;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#7df9c7";
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  const label = state.activeProfile?.name || "Unrecognized face";
  ctx.fillStyle = "rgba(7, 17, 31, 0.88)";
  ctx.fillRect(x, Math.max(0, y - 34), Math.max(140, label.length * 10), 28);
  ctx.fillStyle = "#eff6ff";
  ctx.font = "16px IBM Plex Mono";
  ctx.fillText(label, x + 10, Math.max(18, y - 14));
}

function createFaceDetector() {
  if ("FaceDetector" in window) {
    try {
      return new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      return null;
    }
  }

  return null;
}

async function startCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    elements.video.srcObject = state.stream;
    await elements.video.play();
    setStatus(elements.cameraStatus, "Camera ready", "status-ready");
    elements.toggleListening.disabled = !state.recognition;
    elements.saveProfile.disabled = false;
    state.detector = createFaceDetector();
    detectFaceLoop();
    setWarning(
      state.detector
        ? ""
        : "FaceDetector is not available in this browser. The demo can still capture speech, but auto-recognition may be limited."
    );
  } catch (error) {
    setStatus(elements.cameraStatus, "Camera error", "status-error");
    setWarning(error.message || "Unable to access the camera.");
  }
}

function stopDetectionLoop() {
  if (state.detectTimer) {
    clearTimeout(state.detectTimer);
    state.detectTimer = null;
  }
}

async function detectFaceLoop() {
  stopDetectionLoop();

  const run = async () => {
    if (!state.stream || elements.video.readyState < 2) {
      state.detectTimer = setTimeout(run, DETECTION_INTERVAL_MS);
      return;
    }

    try {
      if (state.detector) {
        const faces = await state.detector.detect(elements.video);
        if (faces.length) {
          const face = faces[0].boundingBox;
          state.facePresent = true;
          state.lastFaceBox = face;
          state.lastDescriptor = captureFaceDescriptor(face);
          matchOrCreateActiveProfile();
        } else {
          state.facePresent = false;
          state.lastFaceBox = null;
          drawOverlay();
        }
      } else {
        // Fallback: treat the whole frame center as the face region for demos.
        const width = elements.video.videoWidth * 0.34;
        const height = elements.video.videoHeight * 0.46;
        const x = (elements.video.videoWidth - width) / 2;
        const y = (elements.video.videoHeight - height) / 2;
        state.facePresent = true;
        state.lastFaceBox = { x, y, width, height };
        state.lastDescriptor = captureFaceDescriptor(state.lastFaceBox);
        matchOrCreateActiveProfile();
      }
    } catch (error) {
      setWarning(`Face detection issue: ${error.message}`);
    }

    drawOverlay();
    state.detectTimer = setTimeout(run, DETECTION_INTERVAL_MS);
  };

  run();
}

function captureFaceDescriptor(box) {
  const captureSize = 24;
  const canvas = elements.faceCapture;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = captureSize;
  canvas.height = captureSize;

  ctx.filter = "grayscale(1) contrast(1.1)";
  ctx.drawImage(
    elements.video,
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

  const { data } = ctx.getImageData(0, 0, captureSize, captureSize);
  const vector = [];
  let sum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] / 255;
    vector.push(value);
    sum += value;
  }

  const avg = sum / vector.length;
  const centered = vector.map((value) => Number((value - avg).toFixed(4)));
  const norm = Math.sqrt(centered.reduce((acc, value) => acc + value * value, 0)) || 1;

  return centered.map((value) => Number((value / norm).toFixed(4)));
}

function descriptorDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum / a.length);
}

function matchOrCreateActiveProfile() {
  if (!state.lastDescriptor) return;

  let bestProfile = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const profile of state.profileStore) {
    const distance = descriptorDistance(state.lastDescriptor, profile.faceDescriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestProfile = profile;
    }
  }

  if (bestProfile && bestDistance < FACE_MATCH_THRESHOLD) {
    bestProfile.lastSeen = Date.now();
    state.activeProfile = bestProfile;
    saveProfiles();
  } else if (
    !state.activeProfile ||
    state.profileStore.some((profile) => profile.id === state.activeProfile.id) ||
    descriptorDistance(state.lastDescriptor, state.activeProfile.faceDescriptor) >= FACE_MATCH_THRESHOLD
  ) {
    state.activeProfile = createBlankProfile();
  } else {
    state.activeProfile.faceDescriptor = state.lastDescriptor;
  }

  renderProfile(state.activeProfile);
  renderKnownProfiles();
}

function createBlankProfile() {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "",
    company: "",
    interests: [],
    goals: [],
    notes: "",
    transcript: "",
    faceDescriptor: state.lastDescriptor,
    lastSeen: Date.now(),
  };
}

function createRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setWarning(
      "SpeechRecognition is not available in this browser. Try Chrome for the full voice demo."
    );
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    state.isListening = true;
    setStatus(elements.speechStatus, "Listening live", "status-active");
    elements.toggleListening.textContent = "Stop Listening";
  };

  recognition.onend = () => {
    state.isListening = false;
    setStatus(elements.speechStatus, "Speech idle", "status-waiting");
    elements.toggleListening.textContent = "Start Listening";
  };

  recognition.onerror = (event) => {
    setStatus(elements.speechStatus, "Speech error", "status-error");
    setWarning(`Speech recognition error: ${event.error}`);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
      if (!event.results[i].isFinal) transcript += " ";
    }

    state.transcript = transcript.trim();
    elements.transcriptOutput.textContent = state.transcript || "Listening...";
    applyTranscriptToProfile();
  };

  return recognition;
}

function applyTranscriptToProfile() {
  if (!state.activeProfile) {
    state.activeProfile = createBlankProfile();
  }

  const extracted = extractFacts(state.transcript);
  const profile = state.activeProfile;

  profile.transcript = state.transcript;
  if (extracted.name) profile.name = extracted.name;
  if (extracted.role) profile.role = extracted.role;
  if (extracted.company) profile.company = extracted.company;
  if (extracted.interests.length) profile.interests = mergeDistinct(profile.interests, extracted.interests);
  if (extracted.goals.length) profile.goals = mergeDistinct(profile.goals, extracted.goals);
  if (extracted.notes.length) {
    profile.notes = mergeNotes(profile.notes, extracted.notes.join(". "));
  }
  profile.lastSeen = Date.now();

  renderProfile(profile);
}

function mergeDistinct(existing = [], incoming = []) {
  return [...new Set([...existing, ...incoming].map((item) => item.trim()).filter(Boolean))];
}

function mergeNotes(existing, incoming) {
  return [existing, incoming].filter(Boolean).join(" ");
}

function extractFacts(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const patterns = {
    name:
      /(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/,
    role:
      /(?:i am|i'm|working as|my role is)\s+(?:an?\s+)?([a-zA-Z\s-]+?)(?:\s+at|\s+who|\s+and|\.|,|$)/i,
    company:
      /(?:at|from)\s+([A-Z][A-Za-z0-9&.\- ]{1,40})(?:\.|,|$)/,
  };

  const interestMatches = Array.from(
    normalized.matchAll(/(?:i love|i like|i enjoy|i'm into)\s+([^.,]+)/gi)
  );
  const goalMatches = Array.from(
    normalized.matchAll(/(?:i want to|my goal is to|i'm building|i am building)\s+([^.,]+)/gi)
  );

  const notes = [];
  const sentences = normalized
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (
      !/(my name is|i am|i'm|this is|i love|i like|i enjoy|i'm into|my goal is to|i want to|i'm building|i am building)/i.test(
        sentence
      )
    ) {
      notes.push(sentence);
    }
  }

  const name = normalized.match(patterns.name)?.[1] ?? "";
  let role = normalized.match(patterns.role)?.[1] ?? "";
  const company = normalized.match(patterns.company)?.[1] ?? "";

  role = role
    .replace(/^(my name is|i am|i'm)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (role && role.toLowerCase() === name.toLowerCase()) {
    role = "";
  }

  const interests = interestMatches
    .flatMap((match) => splitFacts(match[1]))
    .filter((item) => !item.startsWith("to "));
  const goals = goalMatches.flatMap((match) => splitFacts(match[1]));

  if (!name && lower.includes("my name")) {
    notes.unshift(normalized);
  }

  return {
    name,
    role,
    company,
    interests,
    goals,
    notes,
  };
}

function splitFacts(value) {
  return value
    .split(/\band\b|,/i)
    .map((item) => item.replace(/^to\s+/i, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function persistActiveProfile() {
  if (!state.activeProfile || !state.lastDescriptor) return;

  const profile = state.activeProfile;
  profile.faceDescriptor = state.lastDescriptor;
  profile.lastSeen = Date.now();

  const existingIndex = state.profileStore.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) {
    state.profileStore[existingIndex] = profile;
  } else {
    if (!profile.name) {
      profile.name = `Guest ${state.profileStore.length + 1}`;
    }
    state.profileStore.push(profile);
  }

  saveProfiles();
  renderProfile(profile);
  renderKnownProfiles();
}

function resetMemory() {
  state.profileStore = [];
  state.activeProfile = null;
  state.transcript = "";
  state.lastDescriptor = null;
  state.lastFaceBox = null;
  localStorage.removeItem(STORAGE_KEY);
  elements.transcriptOutput.textContent =
    "Press Start Listening and say a few facts like your name, role, interests, or project goals.";
  renderProfile(null);
  renderKnownProfiles();
}

function toggleListening() {
  if (!state.recognition) return;

  if (state.isListening) {
    state.recognition.stop();
    return;
  }

  state.recognition.start();
}

function bindEvents() {
  elements.startCamera.addEventListener("click", startCamera);
  elements.toggleListening.addEventListener("click", toggleListening);
  elements.saveProfile.addEventListener("click", persistActiveProfile);
  elements.resetMemory.addEventListener("click", resetMemory);
  window.addEventListener("beforeunload", stopDetectionLoop);
}

function init() {
  state.recognition = createRecognition();
  renderProfile(null);
  renderKnownProfiles();
  bindEvents();
}

init();
