# Storage Agent Rules

- preserve backward compatibility with saved profiles where practical
- add schema versions for storage shape changes
- do not silently discard old profile data during migrations
- deleting a profile must make it unavailable for future matching

Preferred checks:

- verify save, load, update, and delete paths
- verify reset behavior clears stored profiles
