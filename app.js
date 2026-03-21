import { detectFace, isFaceDetectionSupported } from "./src/cv/faceDetection.js";
import { createFaceFingerprint } from "./src/cv/faceFingerprint.js";
import {
  DEFAULT_FACE_MATCH_THRESHOLD,
  descriptorDistance,
  matchFace,
} from "./src/cv/faceMatcher.js";

const STORAGE_KEY = "recallcam-profiles-v2";
const DETECTION_INTERVAL_MS = 280;
const TRACKING_SMOOTHING = 0.45;

const RELATIONSHIP_TERMS = [
  "daughter",
  "son",
  "wife",
  "husband",
  "mother",
  "father",
  "sister",
  "brother",
  "granddaughter",
  "grandson",
  "friend",
  "neighbor",
  "caregiver",
  "doctor",
  "nurse",
  "therapist",
  "niece",
  "nephew",
  "cousin",
  "aunt",
  "uncle",
];

const elements = {
  video: document.getElementById("camera"),
  overlay: document.getElementById("overlay"),
  faceCapture: document.getElementById("face-capture"),
  faceHud: document.getElementById("face-hud"),
  hudState: document.getElementById("hud-state"),
  hudName: document.getElementById("hud-name"),
  hudRelationship: document.getElementById("hud-relationship"),
  hudNote: document.getElementById("hud-note"),
  hudMovement: document.getElementById("hud-movement"),
  hudConfidence: document.getElementById("hud-confidence"),
  cameraStatus: document.getElementById("camera-status"),
  speechStatus: document.getElementById("speech-status"),
  recognitionState: document.getElementById("recognition-state"),
  profileName: document.getElementById("profile-name"),
  profileSummary: document.getElementById("profile-summary"),
  transcriptOutput: document.getElementById("transcript-output"),
  featureWarning: document.getElementById("feature-warning"),
  startCamera: document.getElementById("start-camera"),
  toggleListening: document.getElementById("toggle-listening"),
  saveProfile: document.getElementById("save-profile"),
  resetMemory: document.getElementById("reset-memory"),
  chipRelationship: document.getElementById("chip-relationship"),
  chipLastInteraction: document.getElementById("chip-last-interaction"),
  factName: document.getElementById("fact-name"),
  factRelationship: document.getElementById("fact-relationship"),
  factLastInteraction: document.getElementById("fact-last-interaction"),
  factLastSeen: document.getElementById("fact-last-seen"),
  factNote: document.getElementById("fact-note"),
  knownProfiles: document.getElementById("known-profiles"),
};

const state = {
  stream: null,
  isListening: false,
  recognition: null,
  transcript: "",
  detectTimer: null,
  profileStore: loadProfiles(),
  activeProfile: null,
  activeMatchConfidence: null,
  activeProfileState: "idle",
  lastDescriptor: null,
  lastFaceBox: null,
  previousFaceBox: null,
  trackedFaceBox: null,
  movementLabel: "still",
};

function loadProfiles() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeProfileRecord).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeProfileRecord(profile) {
  if (!profile || !Array.isArray(profile.faceDescriptor)) return null;
  return {
    id: profile.id ?? createId(),
    name: profile.name ?? "",
    relationship: profile.relationship ?? profile.role ?? "",
    lastInteraction: profile.lastInteraction ?? "",
    note: profile.note ?? profile.notes ?? "",
    transcript: profile.transcript ?? "",
    faceDescriptor: profile.faceDescriptor,
    lastSeen: profile.lastSeen ?? Date.now(),
  };
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profileStore));
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function summarizeProfile(profile) {
  const parts = [];
  if (profile.relationship) parts.push(profile.relationship);
  if (profile.lastInteraction) parts.push(profile.lastInteraction);
  if (profile.note) parts.push(profile.note);
  return parts.join(" • ") || "No memory cues saved yet.";
}

function formatRecognitionState() {
  switch (state.activeProfileState) {
    case "recognized":
      return "Recognized person";
    case "unknown":
      return "New person detected";
    case "no-face":
      return "Camera active, no face";
    case "error":
      return "Camera or speech error";
    default:
      return "System idle";
  }
}

function renderKnownProfiles() {
  const profiles = [...state.profileStore].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));

  if (!profiles.length) {
    elements.knownProfiles.innerHTML = '<p class="empty-state">No profiles saved yet.</p>';
    return;
  }

  elements.knownProfiles.innerHTML = profiles
    .map((profile) => {
      return `
        <article class="known-profile">
          <strong>${escapeHtml(profile.name || "Unknown person")}</strong>
          <span>${escapeHtml(profile.relationship || "Relationship unknown")}</span>
          <span>${escapeHtml(profile.lastInteraction || profile.note || "No recent memory cue saved.")}</span>
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

function renderProfile(profile) {
  elements.recognitionState.textContent = formatRecognitionState();
  renderFaceHud(profile);

  if (!profile) {
    elements.profileName.textContent = state.activeProfileState === "no-face" ? "No face in frame" : "Waiting for a face...";
    elements.profileSummary.textContent =
      "When someone steps into frame, RecallCam will show their saved memory cues here.";
    elements.chipRelationship.textContent = "Relationship: -";
    elements.chipLastInteraction.textContent = "Last interaction: -";
    elements.factName.textContent = "Unknown";
    elements.factRelationship.textContent = "-";
    elements.factLastInteraction.textContent = "-";
    elements.factLastSeen.textContent = "-";
    elements.factNote.textContent = "No notes yet.";
    elements.saveProfile.disabled = !state.lastDescriptor;
    return;
  }

  const isRecognized = state.activeProfileState === "recognized";
  elements.profileName.textContent = isRecognized ? `Recognized: ${profile.name || "Known person"}` : profile.name || "New person detected";
  elements.profileSummary.textContent = summarizeProfile(profile);
  elements.chipRelationship.textContent = `Relationship: ${profile.relationship || "-"}`;
  elements.chipLastInteraction.textContent = `Last interaction: ${profile.lastInteraction || "-"}`;
  elements.factName.textContent = profile.name || "Unknown";
  elements.factRelationship.textContent = profile.relationship || "-";
  elements.factLastInteraction.textContent = profile.lastInteraction || "-";
  elements.factLastSeen.textContent = formatDate(profile.lastSeen);
  elements.factNote.textContent = profile.note || "No notes yet.";
  elements.saveProfile.disabled = !state.lastDescriptor;
}

function renderFaceHud(profile) {
  const hud = elements.faceHud;
  if (!state.trackedFaceBox) {
    hud.classList.add("face-hud-hidden");
    hud.classList.remove("face-hud-visible");
    elements.hudState.textContent = "Tracking idle";
    elements.hudName.textContent = "No face detected";
    elements.hudRelationship.textContent = "Relationship: -";
    elements.hudNote.textContent = "Helpful note: -";
    elements.hudMovement.textContent = "Movement: still";
    elements.hudConfidence.textContent = "Confidence: -";
    return;
  }

  hud.classList.remove("face-hud-hidden");
  hud.classList.add("face-hud-visible");
  elements.hudState.textContent =
    state.activeProfileState === "recognized" ? "Tracking recognized face" : "Tracking new face";
  elements.hudName.textContent =
    state.activeProfileState === "recognized"
      ? profile?.name || "Recognized person"
      : profile?.name || "New person detected";
  elements.hudRelationship.textContent = `Relationship: ${profile?.relationship || "-"}`;
  elements.hudNote.textContent = `Helpful note: ${profile?.note || profile?.lastInteraction || "-"}`;
  elements.hudMovement.textContent = `Movement: ${state.movementLabel}`;
  elements.hudConfidence.textContent =
    state.activeProfileState === "recognized" && state.activeMatchConfidence !== null
      ? `Confidence: ${(state.activeMatchConfidence * 100).toFixed(0)}%`
      : "Confidence: low / new";

  positionFaceHud(state.trackedFaceBox);
}

function positionFaceHud(box) {
  const frame = elements.video.parentElement;
  if (!frame || !box || !elements.video.videoWidth || !elements.video.videoHeight) return;

  const scaleX = frame.clientWidth / elements.video.videoWidth;
  const scaleY = frame.clientHeight / elements.video.videoHeight;
  const hudWidth = elements.faceHud.offsetWidth || 280;
  const left = Math.min(
    Math.max(12, box.x * scaleX),
    Math.max(12, frame.clientWidth - hudWidth - 12)
  );
  const top = Math.max(12, box.y * scaleY + box.height * scaleY + 14);
  const boundedTop = Math.min(top, Math.max(12, frame.clientHeight - 140));
  elements.faceHud.style.transform = `translate3d(${left}px, ${boundedTop}px, 0)`;
}

function smoothFaceBox(nextBox) {
  if (!nextBox) {
    state.previousFaceBox = state.trackedFaceBox;
    state.trackedFaceBox = null;
    state.movementLabel = "still";
    return;
  }

  if (!state.trackedFaceBox) {
    state.previousFaceBox = nextBox;
    state.trackedFaceBox = { ...nextBox };
    state.movementLabel = "arrived";
    return;
  }

  const smoothed = {
    x: state.trackedFaceBox.x + (nextBox.x - state.trackedFaceBox.x) * TRACKING_SMOOTHING,
    y: state.trackedFaceBox.y + (nextBox.y - state.trackedFaceBox.y) * TRACKING_SMOOTHING,
    width:
      state.trackedFaceBox.width +
      (nextBox.width - state.trackedFaceBox.width) * TRACKING_SMOOTHING,
    height:
      state.trackedFaceBox.height +
      (nextBox.height - state.trackedFaceBox.height) * TRACKING_SMOOTHING,
  };

  const previousCenter = getBoxCenter(state.trackedFaceBox);
  const nextCenter = getBoxCenter(nextBox);
  state.previousFaceBox = state.trackedFaceBox;
  state.trackedFaceBox = smoothed;
  state.movementLabel = getMovementLabel(nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y);
}

function getBoxCenter(box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

function getMovementLabel(deltaX, deltaY) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (absX < 6 && absY < 6) return "still";
  if (absX > absY) return deltaX > 0 ? "moving right" : "moving left";
  return deltaY > 0 ? "moving down" : "moving up";
}

function drawOverlay() {
  const { overlay, video } = elements;
  const ctx = overlay.getContext("2d");
  overlay.width = video.videoWidth || overlay.clientWidth;
  overlay.height = video.videoHeight || overlay.clientHeight;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (!state.trackedFaceBox) return;

  const { x, y, width, height } = state.trackedFaceBox;
  const isRecognized = state.activeProfileState === "recognized";
  ctx.lineWidth = 4;
  ctx.strokeStyle = isRecognized ? "#7df9c7" : "#ffc76f";
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  const label = isRecognized
    ? `Recognized${state.activeMatchConfidence ? ` ${(state.activeMatchConfidence * 100).toFixed(0)}%` : ""}`
    : "New person";
  ctx.fillStyle = "rgba(7, 17, 31, 0.88)";
  ctx.fillRect(x, Math.max(0, y - 34), Math.max(170, label.length * 10), 28);
  ctx.fillStyle = "#eff6ff";
  ctx.font = "16px IBM Plex Mono";
  ctx.fillText(label, x + 10, Math.max(18, y - 14));

  ctx.fillStyle = isRecognized ? "rgba(125, 249, 199, 0.9)" : "rgba(255, 199, 111, 0.95)";
  ctx.font = "14px IBM Plex Mono";
  ctx.fillText(`Motion: ${state.movementLabel}`, x + 8, Math.min(overlay.height - 10, y + height + 20));
}

async function startCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    elements.video.srcObject = state.stream;
    await elements.video.play();
    state.activeProfileState = "no-face";
    setStatus(elements.cameraStatus, "Camera ready", "status-ready");
    elements.toggleListening.disabled = !state.recognition;
    elements.saveProfile.disabled = false;
    detectFaceLoop();
    setWarning(
      isFaceDetectionSupported()
        ? "Local-only prototype. Saved memories stay in this browser."
        : "FaceDetector is unavailable in this browser, so the demo uses a center-frame fallback crop."
    );
    renderProfile(state.activeProfile);
  } catch (error) {
    state.activeProfileState = "error";
    setStatus(elements.cameraStatus, "Camera error", "status-error");
    setWarning(error.message || "Unable to access the camera.");
    renderProfile(state.activeProfile);
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
      const face = await detectFace(elements.video, {
        allowFallback: true,
        sourceWidth: elements.video.videoWidth,
        sourceHeight: elements.video.videoHeight,
      });

      if (face) {
        state.lastFaceBox = face;
        smoothFaceBox(face);
        state.lastDescriptor = createFaceFingerprint(elements.video, face, {
          canvas: elements.faceCapture,
        });
        matchOrCreateActiveProfile();
      } else {
        state.lastFaceBox = null;
        smoothFaceBox(null);
        state.lastDescriptor = null;
        state.activeMatchConfidence = null;
        state.activeProfileState = "no-face";
        drawOverlay();
        renderProfile(null);
      }
    } catch (error) {
      state.activeProfileState = "error";
      setWarning(`Face detection issue: ${error.message}`);
    }

    drawOverlay();
    state.detectTimer = setTimeout(run, DETECTION_INTERVAL_MS);
  };

  run();
}

function matchOrCreateActiveProfile() {
  if (!state.lastDescriptor) return;

  const matchResult = matchFace(state.lastDescriptor, state.profileStore, {
    threshold: DEFAULT_FACE_MATCH_THRESHOLD,
  });

  if (matchResult.matched && matchResult.profile) {
    matchResult.profile.lastSeen = Date.now();
    state.activeProfile = matchResult.profile;
    state.activeMatchConfidence = matchResult.confidence;
    state.activeProfileState = "recognized";
    saveProfiles();
  } else if (
    !state.activeProfile ||
    state.profileStore.some((profile) => profile.id === state.activeProfile.id) ||
    descriptorDistance(state.lastDescriptor, state.activeProfile.faceDescriptor) >=
      DEFAULT_FACE_MATCH_THRESHOLD
  ) {
    state.activeProfile = createBlankProfile();
    state.activeMatchConfidence = null;
    state.activeProfileState = "unknown";
  } else {
    state.activeProfile.faceDescriptor = state.lastDescriptor;
    state.activeProfileState = "unknown";
  }

  renderProfile(state.activeProfile);
  renderKnownProfiles();
}

function createBlankProfile() {
  return {
    id: createId(),
    name: "",
    relationship: "",
    lastInteraction: "",
    note: "",
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
    state.activeProfileState = "error";
    setStatus(elements.speechStatus, "Speech error", "status-error");
    setWarning(`Speech recognition error: ${event.error}`);
    renderProfile(state.activeProfile);
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
    state.activeProfileState = "unknown";
  }

  const extracted = extractFacts(state.transcript);
  const profile = state.activeProfile;

  profile.transcript = state.transcript;
  if (extracted.name && !profile.name) profile.name = extracted.name;
  if (extracted.relationship && !profile.relationship) profile.relationship = extracted.relationship;
  if (extracted.lastInteraction) profile.lastInteraction = extracted.lastInteraction;
  if (extracted.note) profile.note = extracted.note;
  profile.lastSeen = Date.now();

  renderProfile(profile);
}

function extractFacts(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const sentences = normalized
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const namePatterns = [
    /(?:my name is|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/,
    /i(?:'m| am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/,
    new RegExp(`i(?:'m| am)\\s+(?:your\\s+)?(?:${RELATIONSHIP_TERMS.join("|")})\\s+([A-Z][a-z]+(?:\\s[A-Z][a-z]+){0,2})`, "i"),
  ];

  let name = "";
  for (const pattern of namePatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      name = match[1].trim();
      break;
    }
  }

  let relationship = "";
  const relationshipPattern = new RegExp(
    `(?:i(?:'m| am)|this is)\\s+(?:your\\s+)?(${RELATIONSHIP_TERMS.join("|")})\\b`,
    "i"
  );
  const relationshipMatch = normalized.match(relationshipPattern);
  if (relationshipMatch?.[1]) {
    relationship = capitalizeWords(relationshipMatch[1]);
  } else {
    for (const term of RELATIONSHIP_TERMS) {
      if (lower.includes(`your ${term}`) || lower.includes(`the ${term}`)) {
        relationship = capitalizeWords(term);
        break;
      }
    }
  }

  let lastInteraction = "";
  for (const sentence of sentences) {
    if (
      /(we|i)\s+(had|met|visited|spoke|talked|called|saw|went|ate|came|spent)|\b(yesterday|today|last night|last week|this morning|on sunday|on monday|on tuesday|on wednesday|on thursday|on friday|on saturday)\b/i.test(
        sentence
      )
    ) {
      lastInteraction = sentence;
      break;
    }
  }

  let note = "";
  for (const sentence of sentences) {
    if (sentence === lastInteraction) continue;
    if (
      /(i visit|i come by|i brought|i bring|i help|i take care|i live|i love|i like|remember|favorite|medication|appointment|every sunday|every week)/i.test(
        sentence
      )
    ) {
      note = sentence;
      break;
    }
  }

  if (!note) {
    const leftover = sentences.find(
      (sentence) =>
        sentence !== lastInteraction &&
        !relationshipPattern.test(sentence) &&
        !/my name is|this is|i'm|i am/i.test(sentence)
    );
    note = leftover || "";
  }

  return {
    name: cleanFact(name),
    relationship: cleanFact(relationship),
    lastInteraction: cleanFact(lastInteraction),
    note: cleanFact(note),
  };
}

function cleanFact(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .slice(0, 120);
}

function capitalizeWords(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function persistActiveProfile() {
  if (!state.activeProfile || !state.lastDescriptor) return;

  const profile = state.activeProfile;
  profile.faceDescriptor = state.lastDescriptor;
  profile.lastSeen = Date.now();
  if (!profile.name) {
    profile.name = `Person ${state.profileStore.length + 1}`;
  }

  const existingIndex = state.profileStore.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) {
    state.profileStore[existingIndex] = profile;
  } else {
    state.profileStore.push(profile);
  }

  state.activeProfileState = "recognized";
  saveProfiles();
  renderProfile(profile);
  renderKnownProfiles();
}

function resetMemory() {
  state.profileStore = [];
  state.activeProfile = null;
  state.activeMatchConfidence = null;
  state.activeProfileState = state.stream ? "no-face" : "idle";
  state.transcript = "";
  state.lastDescriptor = null;
  state.lastFaceBox = null;
  state.previousFaceBox = null;
  state.trackedFaceBox = null;
  state.movementLabel = "still";
  localStorage.removeItem(STORAGE_KEY);
  elements.transcriptOutput.textContent =
    "Press Start Listening and say a few facts like your name, relationship, and something memorable about your last interaction.";
  renderProfile(null);
  renderKnownProfiles();
  drawOverlay();
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
