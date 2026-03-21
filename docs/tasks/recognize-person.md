# Task: Recognize Returning Person

## Context

The app must match a returning person to a stored profile and show memory cues without showing the wrong profile.

## Deliverable

Implement or refine face matching and the recognized-person overlay flow.

## Files To Touch

- `src/cv/*`
- `src/ui/*`
- integration entrypoint modules

## Acceptance Tests

- a known enrolled face is recognized on the same device
- low-confidence matches resolve to unknown state
- the correct saved memory cues appear on the UI

## Out Of Scope

- production-grade face recognition
- remote inference services
