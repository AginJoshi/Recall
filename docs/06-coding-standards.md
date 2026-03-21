# RecallCam Coding Standards

## General Standards

- keep modules small and single-purpose
- prefer explicit names over clever abstractions
- optimize for readability under hackathon time pressure
- preserve privacy and safety constraints in every layer

## TypeScript Standards

- prefer TypeScript for any substantial front-end refactor or modular build setup
- define explicit types for profile records, match results, extracted facts, and storage payloads
- exported functions should prefer explicit return types
- avoid `any` unless there is a clear, documented reason

## Python Standards

- use Python only for helper scripts, tooling, or offline experiments unless the repo architecture changes
- typed functions are preferred
- keep dependencies minimal

## Folder Conventions

- `src/ui`: presentation and interaction logic only
- `src/cv`: face detection, descriptor generation, matching
- `src/nlp`: speech capture, extraction, summarization
- `src/storage`: persistence, migrations, schema handling
- `src/utils`: shared helpers and constants
- `docs`: product, architecture, process, and tasks

## Error Handling

- user-facing failures must produce clear messages for camera, microphone, unsupported browser APIs, and storage issues
- do not fail silently
- low-confidence matches must resolve to unknown state, not forced recognition
- privacy-sensitive failures should prefer safe fallback behavior

## Testing Expectations

- add unit tests for fact extraction and face-match helper logic when test tooling exists
- manually verify the core flow before merging:
  - enroll new person
  - recognize returning person
  - unknown face does not show wrong profile
  - reset/delete clears stored data
  - unsupported browser API shows warning

## How We Use Codex

- explore the repo before editing
- do not rewrite unrelated files
- do not weaken privacy safeguards for convenience
- preserve compatibility with stored profile data unless migration is added
- verify changes with tests or manual checks before finalizing
