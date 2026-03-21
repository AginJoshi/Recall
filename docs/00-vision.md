# RecallCam Vision

## North Star

RecallCam helps people living with Alzheimer's disease and related memory disabilities recognize familiar people and recall the most important context at the right moment.

When a familiar person appears in front of the device camera, the app should calmly surface a few simple memory cues such as:

- name
- relationship
- last interaction
- one helpful note

The experience should reduce confusion and stress, not add more cognitive load.

## Who It's For

- primary users: people experiencing memory loss, especially Alzheimer's disease
- secondary users: caregivers, family members, and clinicians helping manage enrollment and corrections
- demo audience: hackathon judges, collaborators, and early testers evaluating the assistive concept

## What It Must Do

- detect when a face is intentionally presented to the camera
- recognize a previously enrolled person using a stored face descriptor
- show only 3 to 4 high-value recall cues on the UI
- capture speech and extract structured memory facts for enrollment
- allow saved profiles to be corrected or deleted
- keep the MVP fast, local-first, and understandable in a live demo

## What It Must Not Do

- identify random strangers or bystanders without deliberate enrollment
- make medical, clinical, or diagnostic claims
- expose long transcripts or too much text on the main UI
- require cloud infrastructure for the MVP
- silently store more personal information than needed for recall

## Privacy Stance

- local-first by default for the hackathon MVP
- explicit consent required before enrolling a person
- store only the minimum memory cues needed for recall
- unmatched faces should not be turned into permanent profiles unless the user saves them
- the product should clearly communicate that saved memory stays on the device in the MVP

## MVP Definition

The MVP is complete when the app can:

1. enroll a person by capturing face + speech-derived memory cues
2. recognize that person later from the same device/browser
3. display name, relationship, last interaction, and note on the live camera UI
4. let a caregiver or operator edit or delete a saved profile
5. run locally in a modern desktop browser without a backend
