# Recall Demo MongoDB Schema

Database: `recall_demo`
Collection name: `people` 

## people
Fields for each entry:

| field              | type             | notes                                          |
|--------------------|------------------|------------------------------------------------|
| `_id`              | ObjectId         | Primary key.                                   |
| `name`             | string (req)     | Full name. (defaults to PersonX)               |
| `relationship`     | string (req)     | ex. son, daughter, friend, etc.                |
| `occupation`       | string (opt)     | ex. son, daughter, friend, etc.                |
| `organization`     | string (opt)     | ex. son, daughter, friend, etc.                |
| `lastConversation` | string (opt)     | Short summary of most recent conversation.     |
| `embedding`        | array<float>(opt)| Face embedding if matching is implemented.     |
| `createdAt`        | datetime (opt)   | Use if you need audit; otherwise can omit.     |
| `updatedAt`        | datetime (opt)   | Use if you need audit; otherwise can omit.     |


### Common operations
- Add demo data: `POST /add` inserts one sample doc into `people`.
- Create person: `POST /people` with `name`, `relationship`, optional fields. (to be added)
- Update person: `PATCH /people/{id}` with any subset of fields. (to be added)
- Record encounter + summary: `POST /people/{id}/encounter` body: `summary` string → updates `lastConversation`, `lastEncounter`, `updatedAt`. (to be added)
- List people: `GET /people?limit=100` sorted by `lastEncounter` desc. (to be added)

## Add data
`POST /add` inserts 3 sample people with recent encounters for demo UIs.

## Notes / shortcuts
- One collection only (no multi-tenant separation); acceptable for the hackathon. Add `userId` later if needed.
- No schema validation enabled; keep payloads consistent with the table above.
- Connection string: preferred env vars:
  - `MONGO_URI` (full URI) **or** discrete parts:
    - `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_HOST` (default `localhost`), `MONGO_PORT` (default `27017`), `MONGO_PARAMS` (default `retryWrites=true&w=majority`).
  - `MONGO_DB` (default `recall_demo`).
- Driver: async `motor[srv]` is expected by the app.
