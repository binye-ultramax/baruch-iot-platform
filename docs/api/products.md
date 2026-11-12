# Products API

A **product** is a BMS unit built in the Baruch factory. Creating one issues its serial number and records its specification. Products are the factory's inventory; a product becomes a registered **BMS** when it is given a MAC address through the [BMS API](./bms.md).

All routes need `Authorization: Bearer <idToken>` (see [API Guide](./README.md#authentication-in-four-steps)).

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `POST` | `/products` | Administrator | Issue the next serial number and store the unit |
| `GET` | `/products/{serialNumber}` | Any signed-in user | Read one unit |
| `GET` | `/products?batch=…` or `?status=…` | Any signed-in user | List units |
| `GET` | `/products/{serialNumber}/history` | Any signed-in user | Every logged action on one unit |
| `GET` | `/audit?actor=…` | Administrator | Everything one person did, across products and devices |

---

## Serial numbers

```text
BMS-2026-000001
```

`BMS` is the product type, `2026` the year of manufacture, `000001` a six-digit sequence within that year. Serial numbers are assigned by the server, never by the client, and are never reused. Up to 999,999 units per year.

---

## Product status

| Status | Meaning | Set by |
|--------|---------|--------|
| `MANUFACTURED` | Built, not yet paired with a MAC address | `POST /products` |
| `SHIPPED` | Registered as a device | `POST /devices` with this serial number |
| `CLAIMED` | Reserved for a future end-user claiming flow | — |
| `RETIRED` | Decommissioned. Cannot be registered as a device. | — (set by the Baruch team) |

---

## Create a product

`POST /products` — Administrator only.

```bash
curl -s -X POST "$BASE/products" \
  -H "Authorization: Bearer <idToken>" \
  -H "Content-Type: application/json" \
  -d '{
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
| `batchNumber` | Yes | 1–64 characters. Used by the `batch` list filter. |
| `cellCount` | Yes | Whole number, 1–512 |
| `chemistry` | Yes | One of `LiFePO4`, `NMC`, `LTO`, `LeadAcid` (exact spelling) |
| `capacityAh` | No | Number, 0.1–100000 |
| `firmwareVersion` | No | Letters, digits, `.`, `-`, `+`; up to 32 characters, e.g. `1.4.2` |
| `hardwareRevision` | No | 1–64 characters |
| `manufacturedAt` | No | ISO 8601 date (`2026-11-12`) or timestamp |
| `notes` | No | Up to 256 characters. Not included in audit history. |

`201 Created` with the stored record:

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

Optional fields you did not send are absent from the response, not `null`.

| Status | Message |
|--------|---------|
| `400` | `<field> is required.` / `<field> must be 1 to 64 characters.` / `cellCount must be between 1 and 512.` / `chemistry must be one of: LiFePO4, NMC, LTO, LeadAcid.` and similar |
| `403` | `Only administrators can do this.` |
| `507` | `Serial numbers for 2026 are exhausted.` |

---

## Read one product

`GET /products/{serialNumber}`

```bash
curl -s "$BASE/products/BMS-2026-000001" -H "Authorization: Bearer <idToken>"
```

Returns the record as above. Once the unit has been registered as a device the record also contains `deviceId`.

| Status | Message |
|--------|---------|
| `400` | `serialNumber must look like BMS-2026-000001.` |
| `404` | `No product with that serial number.` |

---

## List products

`GET /products?batch=B2026-11-A` or `GET /products?status=MANUFACTURED`

```bash
curl -s "$BASE/products?status=MANUFACTURED&limit=100" -H "Authorization: Bearer <idToken>"
```

| Query | Rules |
|-------|-------|
| `batch` | Exact batch number. Results ordered by serial number. |
| `status` | One of the statuses above. Results newest first. |
| `limit` | 1–200, default 50 |

Exactly one of `batch` or `status` is required.

```json
{ "items": [ { "serialNumber": "BMS-2026-000002", "...": "..." } ], "count": 2 }
```

| Status | Message |
|--------|---------|
| `400` | `Provide a batch or status filter.` / `Filter by batch or status, not both.` |
| `400` | `status must be one of: MANUFACTURED, SHIPPED, CLAIMED, RETIRED.` |
| `400` | `limit must be a whole number.` / `limit must be between 1 and 200.` |

---

## History of one product

`GET /products/{serialNumber}/history` — oldest first.

```bash
curl -s "$BASE/products/BMS-2026-000001/history" -H "Authorization: Bearer <idToken>"
```

```json
{
  "subjectId": "BMS-2026-000001",
  "items": [
    {
      "subjectId": "BMS-2026-000001",
      "occurredAt": "2026-11-12T14:30:00.123Z#a1b2c3",
      "action": "PRODUCT_CREATED",
      "actorEmail": "admin@example.com",
      "actorRole": "Administrator",
      "details": { "model": "BMS-16S-100A", "batchNumber": "B2026-11-A", "cellCount": 16, "chemistry": "LiFePO4" }
    }
  ],
  "count": 1
}
```

| Field | Notes |
|-------|-------|
| `occurredAt` | ISO timestamp with milliseconds, followed by `#` and a short random suffix that keeps entries unique. Strip from `#` onward to display the time. Entries are already in time order. |
| `action` | `PRODUCT_CREATED` today; `STATUS_CHANGED` and `PRODUCT_UPDATED` are reserved for future routes |
| `details` | Varies by action. Shown fields only; never contains `notes`. |

`limit` defaults to 100, maximum 500. Only actions that change data are logged; reads are not.

Note that once a product is registered as a BMS, later actions are logged under the BMS id (`deviceId`), not the serial number. Use [`GET /devices/{deviceId}/history`](./bms.md#history-of-one-bms) for those.

---

## What one person did

`GET /audit?actor=email` — Administrator only, newest first, across both products and devices.

```bash
curl -s "$BASE/audit?actor=admin@example.com&limit=20" -H "Authorization: Bearer <idToken>"
```

Same item shape as history. `subjectId` is a serial number for product actions and a `dev_…` id for device actions. `limit` defaults to 100, maximum 500.

| Status | Message |
|--------|---------|
| `400` | `Provide an actor email, for example ?actor=someone@example.com.` |
| `403` | `Only administrators can do this.` |
