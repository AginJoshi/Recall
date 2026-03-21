# CV Agent Rules

- do not force low-confidence matches into recognized state
- preserve the no-bystander-identification rule
- keep matching and descriptor logic isolated from storage and UI rendering
- document any threshold changes and why they were needed

Preferred checks:

- verify known face matching still works
- verify unknown faces do not reuse the wrong profile
