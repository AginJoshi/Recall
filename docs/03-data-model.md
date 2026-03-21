# RecallCam Data Model

## Storage Choice

MVP storage is local-only and browser-based:

- `localStorage` is acceptable for the prototype
- `IndexedDB` is the preferred upgrade path if profile count or data size grows

## Profile Schema

Each saved person profile should include:

- `id`: stable unique identifier
- `schemaVersion`: profile schema version for migrations
- `displayName`: primary name shown on UI
- `relationship`: relationship to the user
- `lastInteraction`: short recent-memory cue
- `helpfulNote`: short supporting note
- `transcript`: raw or partial transcript captured during enrollment
- `faceDescriptor`: numeric face fingerprint array
- `faceDescriptorVersion`: version of descriptor generation logic
- `lastSeenAt`: most recent successful recognition timestamp
- `createdAt`: creation timestamp
- `updatedAt`: last update timestamp
- `consentStatus`: enrollment consent state

## Retention Fields

Profiles should reserve fields for retention behavior even if the MVP does not automate deletion yet:

- `retentionPolicy`
- `expiresAt`
- `deletedAt`

## Suggested Logical Tables / Collections

If a future backend or IndexedDB schema is added, split logically into:

- `profiles`
- `face_embeddings`
- `interaction_notes`

Suggested relationships:

- `profiles.id` links to `face_embeddings.profile_id`
- `profiles.id` links to `interaction_notes.profile_id`

## Encryption And Key Storage Approach

MVP:

- document clearly that local browser storage is used
- do not claim strong encryption-at-rest unless it is actually implemented
- rely only on platform/browser baseline protections for the prototype

Future production direction:

- encrypt sensitive stored profile data at rest
- keep encryption keys outside plain application storage
- document whether keys are device-bound, user-derived, or managed by a secure backend

## Migration Rules

- every stored profile must include a schema version
- additive migrations are preferred over destructive changes
- migration functions should convert old profiles into the current schema on load
- unknown fields should be preserved when practical
- incompatible descriptor versions should trigger re-enrollment or re-generation rules rather than silent failure
