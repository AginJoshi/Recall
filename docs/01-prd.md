# RecallCam PRD

## Product Summary

RecallCam is a web app prototype for memory support. It uses the laptop camera and microphone to recognize familiar people and surface a few calm, assistive memory cues for the person using the device.

## Core User Stories

### Enroll

As a caregiver or trusted operator, I want to enroll a familiar person so the app can recognize them later and show useful memory cues.

Acceptance criteria:

- the app can capture a face descriptor from the camera
- the app can capture spoken facts from the microphone
- the app extracts or stores the fields `name`, `relationship`, `lastInteraction`, and `note`
- the operator can save the pending profile
- the profile persists locally after refresh

### Identify

As a user with memory difficulty, I want the app to recognize a familiar person when they return to the camera so I can understand who is in front of me.

Acceptance criteria:

- when a saved face is detected with confidence above threshold, the app loads the saved profile
- the app does not show another person's details for a low-confidence face
- when the face is unknown, the UI clearly says the person is new or unrecognized

### Recall

As a user with memory difficulty, I want to see only the most important details about the recognized person so I am not overwhelmed.

Acceptance criteria:

- the UI shows no more than 4 main cues
- the main cues are `name`, `relationship`, `last interaction`, and `helpful note`
- the cues appear on or next to the camera view
- the wording is simple and readable

### Edit

As a caregiver or trusted operator, I want to edit incorrect details so the saved memory cues stay accurate.

Acceptance criteria:

- an existing profile can be updated
- edited values replace the saved values in local storage
- updated profiles are used in future recognition

### Delete

As a caregiver or trusted operator, I want to delete a profile so the person's information is no longer stored on the device.

Acceptance criteria:

- a saved profile can be deleted
- deleted data no longer appears in the saved profiles list
- deleted data is not matched in future recognition

## Non-Goals For MVP

- production-grade biometric identity verification
- healthcare integration
- multi-device sync
- clinician workflows
- fully autonomous background recognition of all people in a space

## Edge Cases

- no camera permission
- no microphone permission
- browser does not support `FaceDetector`
- browser does not support `SpeechRecognition`
- low-confidence face match
- more than one person in frame
- transcript extraction misses or mislabels a fact
