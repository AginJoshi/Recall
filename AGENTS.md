# AGENTS Instructions

## Project Intent

RecallCam is an assistive memory prototype for people with Alzheimer's disease and related memory disabilities.

## Global Rules

- do not implement bystander identification or background surveillance features
- keep the MVP local-first unless the task explicitly adds backend work
- do not make medical or diagnostic claims in code, copy, or docs
- preserve calm, low-cognitive-load UI behavior
- do not remove privacy messaging without replacing it with equally clear language

## File Ownership Guidance

- `src/ui`: assistive experience and display behavior
- `src/cv`: face detection, descriptor generation, matching threshold behavior
- `src/nlp`: transcript-to-facts logic
- `src/storage`: schema, migrations, persistence
- `docs`: product/process/project guidance

## Test Commands

- use lightweight repo-local verification when available
- if adding tooling, document the commands in the relevant subtree `AGENTS.md`

## What Not To Change Without Explicit Need

- storage schema keys already in use
- recognition threshold semantics
- privacy stance of local-first MVP
