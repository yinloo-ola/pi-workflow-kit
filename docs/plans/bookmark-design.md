# Bookmark Feature Design

## Problem
Users have no way to save messages they find useful. They keep asking "where was that thing someone said about X?" and can't find it.

## Design

Add a bookmark system to the chat app. Users can bookmark individual messages and view their bookmarks later.

### Data model
- `Bookmark` with fields: `id` (uuid), `userId`, `messageId`, `createdAt`
- Stored in SQLite table `bookmarks`
- Unique constraint on `(userId, messageId)` — can't bookmark the same message twice

### API
- `POST /bookmarks` — bookmark a message (body: `{ messageId }`)
- `DELETE /bookmarks/:messageId` — remove bookmark
- `GET /bookmarks` — list user's bookmarks (paginated, newest first)

### UI
- Bookmark icon button on each message (toggle)
- `/bookmarks` page showing list of bookmarked messages

### Tech stack
- Backend: Express + SQLite (better-sqlite3)
- Tests: vitest
- Existing patterns: see `src/db.ts` for DB setup, `src/routes/` for route patterns
