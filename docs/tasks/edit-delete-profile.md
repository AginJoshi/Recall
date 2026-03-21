# Task: Edit And Delete Profile

## Context

Caregivers need basic control over saved memory records so information can be corrected or removed.

## Deliverable

Add or refine profile editing and deletion flows in the local profile store and UI.

## Files To Touch

- `src/ui/*`
- `src/storage/*`

## Acceptance Tests

- a saved profile can be edited and the updates persist
- a saved profile can be deleted and no longer appears
- deleted profiles are not matched again

## Out Of Scope

- server-side audit logs
- role-based access control
