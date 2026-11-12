# Products API

Factory records for every BMS unit. Each unit gets a serial number when it is created, and its metadata lives in the `BmsProducts` table.

Base URL and sign-in are the same as the [Auth API](./auth-api.md). Every route here needs a token from `POST /auth/login`:

```text
Authorization: Bearer <idToken>
```

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `POST` | `/products` | Administrator | Issue the next serial number and store the unit |
| `GET` | `/products/{serialNumber}` | Any signed-in user | Read one unit |
| `GET` | `/products?batch=…` or `?status=…` | Any signed-in user | List units |

---

## Serial numbers

```text
BMS-2026-000001
```

`BMS` is the product type, `2026` the year of manufacture, and `000001` a six-digit sequence within that year. The sequence comes from the `BmsSerialCounters` table, incremented atomically, so two requests at the same moment never receive the same number. A serial is only taken after the request body has passed validation.

---

## Create a product

`POST /products` — Administrator only.

```powershell
$BASE = "https://v8yde6qhhh.execute-api.eu-west-2.amazonaws.com"
$session = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" -ContentType 'application/json' `
  -Body '{"email":"admin@example.com","password":"…"}'
$headers = @{ Authorization = "Bearer $($session.tokens.idToken)" }

Invoke-RestMethod -Method Post -Uri "$BASE/products" -Headers $headers -ContentType 'application/json' -Body '{
  "model": "BMS-16S-100A",
  "batchNumber": "B2026-11-A",
  "cellCount": 16,
  "chemistry": "LiFePO4",
  "capacityAh": 100,
  "firmwareVersion": "1.4.2",
  "hardwareRevision": "rev C",
  "manufacturedAt": "2026-11-12"
}'
```

| Field | Required | Rules |
|-------|----------|-------|
| `model` | Yes | 1–64 characters |
| `batchNumber` | Yes | 1–64 characters. Used by the batch filter. |
| `cellCount` | Yes | Whole number, 1–512 |
| `chemistry` | Yes | `LiFePO4`, `NMC`, `LTO`, or `LeadAcid` |
| `capacityAh` | No | Number, 0.1–100000 |
| `firmwareVersion` | No | Like `1.4.2` |
| `hardwareRevision` | No | 1–64 characters |
| `manufacturedAt` | No | ISO 8601 date or timestamp |
| `notes` | No | Up to 256 characters |

Success returns `201` with the stored row:

```json
{
  "serialNumber": "BMS-2026-000001",
  "status": "MANUFACTURED",
  "model": "BMS-16S-100A",
  "batchNumber": "B2026-11-A",
  "cellCount": 16,
  "chemistry": "LiFePO4",
  "capacityAh": 100,
  "firmwareVersion": "1.4.2",
  "hardwareRevision": "rev C",
  "manufacturedAt": "2026-11-12",
  "createdBy": "admin@example.com",
  "createdAt": "2026-11-12T14:30:00Z",
  "updatedAt": "2026-11-12T14:30:00Z"
}
```

`status` starts at `MANUFACTURED`. The other values, `SHIPPED`, `CLAIMED`, and `RETIRED`, are reserved for later routes.

---

## Read one product

`GET /products/{serialNumber}`

```powershell
Invoke-RestMethod -Uri "$BASE/products/BMS-2026-000001" -Headers $headers
```

Lowercase serials are accepted and normalised. Returns the row, or `404`.

---

## List products

`GET /products?batch=B2026-11-A`
`GET /products?status=MANUFACTURED`

```powershell
Invoke-RestMethod -Uri "$BASE/products?batch=B2026-11-A&limit=100" -Headers $headers
```

Exactly one of `batch` or `status` is required. `limit` defaults to 50, maximum 200. Status results are newest first.

```json
{ "items": [ … ], "count": 2 }
```

---

## Errors

| Status | Message | When |
|--------|---------|------|
| `401` | `Unauthorized` | No token, or an expired or invalid one. Returned by API Gateway before the function runs. |
| `401` | `Sign in to continue.` | Token had no email claim. |
| `403` | `Only administrators can do this.` | `POST /products` by an Operator. |
| `400` | `<field> is required.` and similar | Body failed validation. See the field rules above. |
| `400` | `serialNumber must look like BMS-2026-000001.` | Bad path parameter. |
| `400` | `Provide a batch or status filter.` | Listing without a filter. |
| `404` | `No product with that serial number.` | |
| `507` | `Serial numbers for 2026 are exhausted.` | 999,999 units issued in one year. |

---

## Tables

**`BmsProducts`** — partition key `serialNumber`. Indexes `byBatch` (`batchNumber`, `serialNumber`) and `byStatus` (`status`, `createdAt`). Point-in-time recovery is on.

**`BmsSerialCounters`** — partition key `counterId` (the year, e.g. `2026`). One attribute, `lastSequence`.

Both tables are kept if the stack is deleted.

---

## Making someone an administrator

`POST /products` needs the `Administrator` role. In the AWS console, open Cognito in `eu-west-2`, user pool `baruch-auth-users`, find the user, and add them to the `Administrator` group. They must log in again afterwards so their token carries the new group.
