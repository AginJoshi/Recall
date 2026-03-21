# RecallCam Architecture

## System Overview

RecallCam is organized into five main modules:

- `ui`: camera view, overlay memory card, transcript panel, saved profiles list, controls
- `cv`: face detection, face crop, face fingerprint generation, face matching
- `nlp`: speech-to-text, fact extraction, profile summarization
- `storage`: local profile persistence, schema versioning, deletion, retention handling
- `utils`: shared constants, formatting, helper functions

## Data Flow

1. Browser camera API streams frames into the UI layer.
2. CV layer detects a face and crops the active face region.
3. CV layer creates a face descriptor and compares it against stored descriptors.
4. If the face matches a saved profile above threshold, the storage layer returns that profile.
5. If the face is unknown, the NLP layer can listen for speech and build a pending profile.
6. NLP extracts `name`, `relationship`, `lastInteraction`, and `note` from transcript text.
7. Storage persists the profile locally.
8. UI renders the saved recall cues on top of or beside the camera.

## Module Boundaries

### UI

- owns rendering and user interactions
- must not contain descriptor math or storage internals
- can consume structured view models only

### CV

- owns face presence detection and matching logic
- returns either a confident match or an unknown result
- must not persist profiles directly

### NLP

- owns transcript handling and structured fact extraction
- returns short fields, not full UI markup
- should cap visible output to 3 to 4 memory cues

### Storage

- owns read/write/delete for profiles
- owns schema versioning and migration execution
- provides profile data to UI/CV/NLP as typed objects

## On-Device Vs Cloud

MVP decision:

- all recognition data, notes, and transcripts live on-device only
- no backend is required for the hackathon version

Future option:

- cloud sync may be added later, but only with explicit privacy review, consent flow, and encryption strategy

## No Bystander ID Rule

- the system must not permanently identify or store incidental bystanders
- only an intentionally captured, reviewed, and saved person becomes a profile
- unknown faces can exist temporarily as pending enrollment state, but should not be persisted automatically without user action
- if multiple people are in view, MVP behavior should either choose one clear primary face or reject enrollment until the frame is cleaner

## Where Data Lives

- face descriptors live in local browser storage for the MVP
- notes and transcript-derived cues live in the same local profile store
- future cloud storage, if added, must separate embeddings from presentation-layer notes with explicit access rules
