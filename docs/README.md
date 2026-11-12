# Baruch IoT Platform — Documentation

Documentation for the Baruch IoT Platform, a monitoring and provisioning system for battery management systems (BMS) and battery-powered gateways.

## For app developers — `docs/api/`

**Share only this folder** with anyone building against the API. Examples use fake emails (`operator@example.com`, `admin@example.com`) and the placeholder `<password>`. No real credentials, AWS account details, or deploy steps.

| Document | Description |
|----------|-------------|
| [api/README.md](./api/README.md) | Start here: base URL, authentication, roles, conventions, error format |
| [api/auth.md](./api/auth.md) | Register, confirm, sign in, refresh — with JavaScript, Kotlin, and Swift examples |
| [api/products.md](./api/products.md) | Factory records and serial numbers for BMS units built by Baruch |
| [api/devices.md](./api/devices.md) | Register a BMS by MAC address, receive its keys, find it, read its history |

## For the Baruch team — `docs/internal/`

| Document | Description |
|----------|-------------|
| [internal/architecture.md](./internal/architecture.md) | AWS design: API Gateway, Cognito, Lambda, DynamoDB, KMS; routes, code layout, security |
| [internal/data-model.md](./internal/data-model.md) | DynamoDB tables, keys, indexes, transactions; web mock model |
| [internal/deployment.md](./internal/deployment.md) | GitHub Actions → SAM deploy, IAM role, manual deploy, admin tasks |
| [internal/PRD.md](./internal/PRD.md) | Product requirements (web MVP) and backend scope delivered |
| [internal/roadmap.md](./internal/roadmap.md) | Phases, status, and technical debt |
| [internal/user-guide.md](./internal/user-guide.md) | Web dashboard guide (mock data) |

## Repository layout

```
baruch-iot-platform/
├── web/        # React web dashboard (MVP, mock data)
├── cloud/      # Auth, products, and devices APIs (SAM: Cognito, Lambda, DynamoDB, KMS)
├── embedded/   # BMS / gateway firmware (planned)
└── docs/
    ├── api/       # shareable API docs
    └── internal/  # engineering docs
```

## Quick start

**Call the API**

```bash
BASE=https://v8yde6qhhh.execute-api.eu-west-2.amazonaws.com
curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"operator@example.com","password":"<password>"}'
```

Then follow [api/README.md](./api/README.md).

**Run the web dashboard**

```bash
cd web && npm install && npm run dev
```

Open `http://localhost:5173`. Mock credentials are in [internal/user-guide.md](./internal/user-guide.md).

**Run the backend tests**

```bash
cd cloud && python -m unittest discover -s tests
```
