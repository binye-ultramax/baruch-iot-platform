# Data Model

Internal. Last updated November 2026.

Two data models exist today:

1. **Cloud (implemented)** — Cognito users and five DynamoDB tables behind the deployed API.
2. **Web dashboard (mock)** — TypeScript interfaces with static data in `web/src/data/`, from the MVP. Still used by the dashboard; to be replaced by the API.

---

## 1. Cloud data model

### Entity relationships

```mermaid
erDiagram
  User ||--o{ AuditEntry : performs
  Product ||--o| Device : "becomes (FACTORY only)"
  Device ||--|| DeviceMac : "has exactly one"
  Product ||--o{ AuditEntry : "subject of"
  Device ||--o{ AuditEntry : "subject of"
  SerialCounter ||--o{ Product : issues

  User {
    string sub PK "Cognito user id, returned as user.id"
    string email "username, lower-case"
    string name
    string groups "Operator and/or Administrator"
  }
  Product {
    string serialNumber PK "BMS-2026-000001"
    string status "MANUFACTURED SHIPPED CLAIMED RETIRED"
    string deviceId "set when registered"
  }
  Device {
    string deviceId PK "dev_ + ULID"
    string macAddress
    string serialNumber "FACTORY only"
    string origin "FACTORY or EXTERNAL"
  }
  DeviceMac {
    string macAddress PK
    string deviceId
  }
  AuditEntry {
    string subjectId PK "serialNumber or deviceId"
    string occurredAt SK
    string action
    string actorEmail
  }
  SerialCounter {
    string counterId PK "year"
    number lastSequence
  }
```

### User (Cognito)

Not a DynamoDB table. Stored in the Cognito user pool `baruch-auth-users`.

| Attribute | Notes |
|-----------|-------|
| `sub` | UUID, immutable. The API returns it as `user.id`. |
| `email` | Username. Lower-cased, case-insensitive match. Verified by code. |
| `name` | Required, mutable. |
| groups | `Operator` (default after confirmation) and/or `Administrator` (assigned manually). Role = `Administrator` if in that group, else `Operator`. |

### `BmsProducts`

One row per BMS built by Baruch. Partition key `serialNumber`.

| Attribute | Type | Notes |
|-----------|------|-------|
| `serialNumber` | S | `BMS-YYYY-NNNNNN`. PK. |
| `status` | S | `MANUFACTURED` → `SHIPPED` (on device registration). `CLAIMED`, `RETIRED` reserved. |
| `model` | S | 1–64 chars |
| `batchNumber` | S | 1–64 chars |
| `cellCount` | N | 1–512 |
| `chemistry` | S | `LiFePO4` `NMC` `LTO` `LeadAcid` |
| `capacityAh` | N | optional, 0.1–100000 |
| `firmwareVersion` | S | optional |
| `hardwareRevision` | S | optional, 1–64 chars |
| `manufacturedAt` | S | optional, ISO 8601 |
| `notes` | S | optional, ≤256 chars. Never copied into audit `details`. |
| `deviceId` | S | set when registered as a device |
| `createdBy` | S | actor email |
| `createdAt`, `updatedAt` | S | ISO 8601 UTC |

Indexes:

| GSI | Keys | Used by |
|-----|------|---------|
| `byBatch` | `batchNumber`, `serialNumber` | `GET /products?batch=` |
| `byStatus` | `status`, `createdAt` | `GET /products?status=` (newest first) |

Point-in-time recovery on. Retained on stack deletion.

### `BmsSerialCounters`

Partition key `counterId` = four-digit year. One attribute `lastSequence` (N). Incremented with an atomic `ADD` by `POST /products` after body validation passes, so a failed request never consumes a number. `507` when the sequence exceeds 999,999.

### `BmsDevices`

One row per registered BMS, factory or external. Partition key `deviceId`.

| Attribute | Type | Notes |
|-----------|------|-------|
| `deviceId` | S | `dev_` + 26-char Crockford-base32 ULID (48-bit ms timestamp + 80 random bits). PK. Time-ordered. |
| `macAddress` | S | `AA:BB:CC:DD:EE:FF`, normalised. Unique via `BmsDeviceMacs`. |
| `serialNumber` | S | FACTORY devices only. Absent for EXTERNAL. |
| `origin` | S | `FACTORY` or `EXTERNAL` |
| `manufacturer` | S | `Baruch` for factory, supplied for external |
| `model` | S | optional; copied from product for factory |
| `firmwareVersion` | S | optional; copied from product for factory if not supplied |
| `instantReadingKey` | S | **ciphertext**: base64 of KMS `Encrypt` output, encryption context `{deviceId, field: instantReadingKey}`. Plaintext is 32 random bytes, URL-safe base64. |
| `activationKeyHash` | S | SHA-256 hex of the normalised activation key (`XXXX-XXXX-XXXX-XXXX`, alphabet without `0 O 1 I`). Plaintext never stored. |
| `activationStatus` | S | `PENDING`. Future: `ACTIVATED`, `REVOKED`. Reset to `PENDING` on key rotation. |
| `registeredBy` | S | actor email |
| `registeredAt`, `updatedAt` | S | ISO 8601 UTC |

Indexes:

| GSI | Keys | Used by |
|-----|------|---------|
| `bySerial` | `serialNumber` | `GET /devices?serial=`. Sparse: only factory units appear. |

`instantReadingKey` and `activationKeyHash` are stripped from every API response (`SECRET_FIELDS` in `shared/devices.py`).

Point-in-time recovery on. Retained.

### `BmsDeviceMacs`

Partition key `macAddress`. Attributes `deviceId`, `registeredAt`. Exists so that a MAC can be claimed with `attribute_not_exists(macAddress)` inside the registration transaction, and to serve `GET /devices?mac=` with a single `get_item` followed by one more on `BmsDevices`. Retained.

### `BmsAuditLog`

Append-only. Partition key `subjectId`, sort key `occurredAt`.

| Attribute | Type | Notes |
|-----------|------|-------|
| `subjectId` | S | `serialNumber` for product actions, `deviceId` for device actions. PK. |
| `occurredAt` | S | `<ISO ms UTC>Z#<6 hex>`; the suffix makes two events in the same millisecond distinct. SK, so a subject's history is naturally time-ordered. |
| `action` | S | `PRODUCT_CREATED`, `DEVICE_REGISTERED`, `ACTIVATION_KEY_ROTATED`. Reserved: `STATUS_CHANGED`, `PRODUCT_UPDATED`. |
| `actorEmail`, `actorRole` | S | from the JWT |
| `sourceIp`, `userAgent`, `requestId` | S | from API Gateway, when present |
| `details` | M | action-specific summary, never secrets or `notes` |

Indexes:

| GSI | Keys | Used by |
|-----|------|---------|
| `byActor` | `actorEmail`, `occurredAt` | `GET /audit?actor=` (newest first) |

Every entry is written in the same `TransactWriteItems` as the change it records, with `attribute_not_exists(subjectId) AND attribute_not_exists(occurredAt)`. No update or delete path exists in code. Point-in-time recovery on. Retained.

### Write transactions

| Operation | Items in one transaction |
|-----------|--------------------------|
| `POST /products` | Put `BmsProducts` (cond. serial not exists) · Put `BmsAuditLog` |
| `POST /devices` | Put `BmsDevices` (cond. id not exists) · Put `BmsDeviceMacs` (cond. MAC not exists) · Put `BmsAuditLog` · *[factory]* Update `BmsProducts` set `deviceId`, `status=SHIPPED` (cond. exists and no `deviceId`) |
| `POST /devices/{id}/activation-key` | Update `BmsDevices` (cond. exists) · Put `BmsAuditLog` |

`CancellationReasons` index → error: MAC item failed → `409 MAC already registered`; product item failed → `409 already registered as a device`.

### Mapping to API responses

| Response field | Source |
|----------------|--------|
| `user.id` / `user.email` / `user.name` | ID token claims `sub`, `email`, `name` |
| `user.role` | `cognito:groups` claim (login also calls `AdminListGroupsForUser`) |
| product record | `BmsProducts` item verbatim |
| device record | `BmsDevices` item minus `SECRET_FIELDS` |
| `instantReadingKey`, `activationKey` | generated in the Lambda, returned once, not re-readable |
| history `items` | `BmsAuditLog` query by `subjectId`, ascending |

---

## 2. Web dashboard model (mock, MVP)

Unchanged since the MVP. Source: `web/src/data/mockUsers.ts`, `web/src/data/mockDevices.ts`.

| Entity | Key fields | Future source |
|--------|------------|---------------|
| `User` | `email`, `name`, `role` | `POST /auth/login` → `user` |
| `UserProfileDetails` | department, phone, timezone, notifications | No backend yet |
| `Device` | `id`, `name`, `model`, `group`, `status`, `soc`, `energyKwh`, `capacityKwh`, `location`, `firmware`, `hardware`, `chemistry`, `cells[]`, `socHistory[]`, `scorecardMetrics[]` | Identity fields from `GET /devices/{deviceId}`; telemetry (SOC, cells, location, status) has no backend yet |
| `CellData`, `SocDataPoint`, `ScorecardMetric` | per-cell voltage/balance, hourly SOC, health scores | Telemetry ingestion (planned) |

Differences the frontend will need to absorb when it connects:

- Mock device ids are `dev-01`; real ones are `dev_01JCMK…`.
- Mock `role` strings match (`Administrator`, `Operator`).
- Mock `firmware`/`hardware` map to `firmwareVersion`/`hardwareRevision`; `chemistry` matches.
- There is no fleet list route yet; `GET /devices` requires `?mac=` or `?serial=`. A paginated list is on the roadmap.
- Mock credentials (`admin@baruch.io` / `admin123`) do not exist in Cognito.
