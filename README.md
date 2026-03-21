# RecallCam Prototype

RecallCam is a lightweight browser prototype for a hackathon demo focused on helping people living with Alzheimer's disease recognize and recall important details about the person in front of them.

The idea is simple: when someone approaches the laptop camera, the app can identify them, surface remembered context, and use recent conversation to refresh helpful details for future interactions.

Core prototype capabilities:

- Uses your laptop webcam to watch for a face.
- Captures what the person says with the browser speech recognition API.
- Extracts useful facts like name, role, company, interests, goals, and notes.
- Saves a simple face fingerprint plus remembered facts in local browser storage.
- Shows those details back on the UI when the same person comes back into frame.

## Why this matters

For people with Alzheimer's disease, repeated social interactions can become stressful when names, relationships, or conversational context are hard to recall. RecallCam is meant to explore a gentle assistive interface that can reduce that friction by presenting a familiar person's key details directly on the camera view.

## How to run

Because this app uses webcam and microphone browser APIs, serve it locally instead of opening the HTML file directly.

### Option 1

If Python is installed:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

### Option 2

Use any static file server you already have.

## Demo flow

1. Click `Start Camera`.
2. Click `Start Listening`.
3. Say a few facts, for example:

```text
My name is Maya Patel. I'm a product designer at Figma.
I enjoy prototyping and computer vision.
I'm building a memory assistant for networking events.
```

4. Click `Save Snapshot` to store the face + memory.
5. Step away and come back. The UI should match the face fingerprint and show remembered details.

## Prototype notes

- Best experience: recent Chrome on desktop.
- Face matching is intentionally lightweight for demo speed and runs entirely in the browser.
- Stored data is local to the browser and can be cleared with `Reset Memory`.
- If `FaceDetector` is unavailable, the app falls back to a center-frame face crop so you can still demo the memory flow.
