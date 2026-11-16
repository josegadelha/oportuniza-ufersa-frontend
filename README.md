# Oportuniza UFERSA

Frontend for the UFERSA academic opportunities platform, built with React, TypeScript, and Vite.

## Setup

Copy `.env.example` to `.env`, then install dependencies and start the development server:

```sh
npm install
npm run dev
```

The default configuration enables mock services:

```env
VITE_USE_MOCKS=true
VITE_API_URL=http://localhost:8080/api/v1
```

Mock login identifies the profile from the username: use `aluno.ufersa` or `discente` for a student, and `prof.ufersa` or `docente` for a professor. Any non-empty password is accepted. Mock sessions, profiles, notifications, opportunities, and candidacies are persisted in the browser's local storage.

To use the backend, set `VITE_USE_MOCKS=false` and make the API available at `VITE_API_URL`.
The current backend does not expose a public profile lookup by ID, so `/perfil/:id` can display other users only when mock services are enabled.

## Validation

```sh
npm run build
npm run lint
```
