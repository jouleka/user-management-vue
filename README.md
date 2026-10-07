# UserHub

A simple user management application for creating, updating, and deleting user records with address auto-completion.

## Features

- User management (create, edit, delete)
- Google Places integration for address auto-completion
- Clean, responsive UI

## Setup

1. Clone the repository
2. Install dependencies:

```
npm install
```

3. Create a `.env` file with your Google Places API key:

```
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
```

4. Start the development server:

```
npm run dev
```

## Dependency security

Use Node.js 22.22.2 or newer (CI uses Node.js 24). Install reproducibly with
`npm ci`, then run `npm audit`, `npm run build`, `npm run lint`, and
`npm run test:unit -- --run`. Vitest 5 includes the worker and mock-server
security fixes. Vue and TypeScript lint rules use their official flat configs
directly, avoiding the unpatched `fast-glob` / `braces` discovery dependency.
Dependabot checks npm packages and GitHub Actions weekly.

Google Places browser keys are public client configuration. Restrict the key
to your deployment's HTTP referrers and the required Maps/Places APIs in
Google Cloud; never put a server API key in a `VITE_*` variable.
