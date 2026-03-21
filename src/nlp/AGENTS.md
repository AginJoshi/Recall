# NLP Agent Rules

- output short structured facts only
- prioritize `name`, `relationship`, `lastInteraction`, and `helpfulNote`
- do not surface the full transcript as the primary recall UI
- preserve predictable fallback behavior when extraction is uncertain

Preferred checks:

- verify extraction on simple family and caregiver phrases
- verify noisy transcripts still produce compact output
