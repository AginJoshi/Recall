# Task: Enroll Profile Flow

## Context

RecallCam needs a reliable enrollment flow for creating a saved profile from face capture plus spoken memory cues.

## Deliverable

Implement or refine the flow for capturing an unknown face, listening to speech, extracting the key fields, and saving a local profile.

## Files To Touch

- `src/ui/*`
- `src/nlp/*`
- `src/storage/*`
- any top-level integration file that wires these modules together

## Acceptance Tests

- a new person can be saved with `name`, `relationship`, `lastInteraction`, and `helpfulNote`
- the profile persists after refresh
- the pending profile is not stored until explicitly saved

## Out Of Scope

- cloud sync
- clinician workflows
- advanced identity verification
