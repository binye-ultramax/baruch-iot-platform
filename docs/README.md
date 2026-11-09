# Baruch IoT Platform — Documentation

Documentation for the Baruch IoT Platform, a fleet monitoring system for battery-powered gateway devices.

## Contents

| Document | Description |
|----------|-------------|
| [PRD.md](./PRD.md) | Product requirements, goals, features, and success criteria |
| [architecture.md](./architecture.md) | System architecture and component overview |
| [data-model.md](./data-model.md) | Core entities, fields, and relationships |
| [user-guide.md](./user-guide.md) | End-user guide for the web dashboard |
| [auth-api.md](./auth-api.md) | How to register, confirm, and sign in through the auth API |
| [roadmap.md](./roadmap.md) | Planned phases and future work |

## Repository layout

```
baruch-iot-platform/
├── web/        # React web dashboard (implemented)
├── cloud/      # Auth API (register, confirm, login)
├── embedded/   # Device firmware (planned)
└── docs/       # Product and technical documentation
```

## Quick start (web)

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with mock credentials listed in [user-guide.md](./user-guide.md).
