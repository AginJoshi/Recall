# Contributing

## Branching

- create feature branches from `main`
- use clear names such as `feature/enrollment-flow` or `fix/face-match-threshold`

## Commits

- keep commit messages short and descriptive
- group related changes together
- avoid mixing product, refactor, and unrelated formatting work in one commit

## Pull Request Checklist

- feature or fix works locally
- privacy constraints were respected
- tests or manual verification were completed
- screenshots are included for UI changes
- docs were updated if behavior changed

## Code Review Rubric

Reviewers should focus on:

- correctness
- privacy and safety behavior
- low-confidence recognition handling
- readability and maintainability
- user experience for memory-impaired users

## Definition Of Done

A change is done when:

- the requested behavior works
- there is no obvious regression in enroll/identify/recall flows
- privacy-sensitive behavior remains intact
- tests or manual validation are recorded
- docs are updated if needed
