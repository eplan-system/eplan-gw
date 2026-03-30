# Firestore コレクション設計案

## コレクション

- `Users`: `id`, `name`, `email`, `department`, `role`, `color`, `mobile`
- `Schedules`: `id`, `title`, `startAt`, `endAt`, `ownerUserId`, `participantUserIds`, `memo`, `createdAt`, `updatedAt`
- `Facilities`: `id`, `name`, `category`, `location`, `notes`
- `Reservations`: `id`, `facilityId`, `title`, `startAt`, `endAt`, `userId`, `memo`, `createdAt`, `updatedAt`
- `Posts`: `id`, `title`, `body`, `authorUserId`, `pinned`, `createdAt`, `updatedAt`
- `Comments`: `id`, `postId`, `body`, `authorUserId`, `createdAt`

## インデックス想定

- `Schedules`: `startAt desc`
- `Reservations`: `startAt desc`
- `Posts`: `createdAt desc`
- `Comments`: `postId asc, createdAt desc`
