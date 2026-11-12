# Devices API

A **device** is a BMS that the platform knows by its MAC address. Registering a device gives it a permanent `deviceId` and two secrets the hardware needs:

- **Instant reading key** — used by the BMS to send live readings. Shown once.
- **Activation key** — a short code (`K7PM-3XQD-R9HT-WB2N`) the end user types in to pair the BMS. Shown once; can be replaced.

A device is either a unit Baruch built (it has a serial number from the [Products API](./products.md)) or a third-party unit (no serial number, a manufacturer name instead). Both get the same kind of record.

All routes need `Authorization: Bearer <idToken>` (see [API Guide](./README.md#authentication-in-four-steps)).

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `POST` | `/devices` | Administrator | Register a device; returns its id and both keys |
| `GET` | `/devices/{deviceId}` | Any signed-in user | Read one device |
| `GET` | `/devices?mac=…` or `?serial=…` | Any signed-in user | Find a device |
| `POST` | `/devices/{deviceId}/activation-key` | Administrator | Issue a new activation key |
| `GET` | `/devices/{deviceId}/history` | Any signed-in user | Who did what to this device |

---

## Device ids

```text
dev_01JCMK3Q7X8R2N5VBHT9AZW4E6
```

`dev_` followed by 26 upper-case letters and digits. Assigned by the server. Case-sensitive. Ids created later sort after ids created earlier, so sorting by `deviceId` is sorting by registration time. Treat it as an opaque string otherwise.

---

## The device record

```json
{
  "deviceId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
  "macAddress": "AA:BB:CC:DD:EE:01",
  "origin": "FACTORY",
  "serialNumber": "BMS-2026-000001",
  "manufacturer": "Baruch",
  "model": "BMS-16S-100A",
  "firmwareVersion": "1.4.2",
  "activationStatus": "PENDING",
  "registeredBy": "admin@example.com",
  "registeredAt": "2026-11-12T15:00:00Z",
  "updatedAt": "2026-11-12T15:00:00Z"
}
```

| Field | Notes |
|-------|-------|
| `origin` | `FACTORY` (has `serialNumber`) or `EXTERNAL` (has `manufacturer` only) |
| `serialNumber` | Present only for `FACTORY` devices |
| `manufacturer` | `Baruch` for factory units; whatever was supplied for external ones |
| `model`, `firmwareVersion` | Optional; absent when unknown |
| `activationStatus` | `PENDING` until the BMS is paired. Resets to `PENDING` when the activation key is rotated. Other values will be added with the pairing flow. |

The two secrets are **never** part of the record. They appear only in the response that creates them (see below).

---

## Register a device

`POST /devices` — Administrator only.

**Factory unit** — send the serial number. `manufacturer` and `model` are filled in from the product record, and so is `firmwareVersion` unless you send a newer one.

```bash
curl -s -X POST "$BASE/devices" \
  -H "Authorization: Bearer <idToken>" \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:01","serialNumber":"BMS-2026-000001"}'
```

**External unit** — no serial number; send the manufacturer instead.

```bash
curl -s -X POST "$BASE/devices" \
  -H "Authorization: Bearer <idToken>" \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:02","manufacturer":"Daly","model":"16S 100A","firmwareVersion":"2.1"}'
```

| Field | Required | Rules |
|-------|----------|-------|
| `macAddress` | Yes | 12 hex digits in any common format. Stored and returned as `AA:BB:CC:DD:EE:FF`. All-zero and all-FF are rejected. Must not already be registered. |
| `serialNumber` | One of these two | Must exist as a product and not be `RETIRED`. Must not already be registered. |
| `manufacturer` | One of these two | 1–64 characters. Ignored if `serialNumber` is given. |
| `model` | No | 1–64 characters. Ignored for factory units. |
| `firmwareVersion` | No | Letters, digits, `.`, `-`, `+`; up to 32 characters. For factory units, overrides the product's value when given. |

`201 Created` — the device record **plus the two secrets**:

```json
{
  "deviceId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
  "macAddress": "AA:BB:CC:DD:EE:01",
  "origin": "FACTORY",
  "serialNumber": "BMS-2026-000001",
  "manufacturer": "Baruch",
  "model": "BMS-16S-100A",
  "activationStatus": "PENDING",
  "registeredBy": "admin@example.com",
  "registeredAt": "2026-11-12T15:00:00Z",
  "updatedAt": "2026-11-12T15:00:00Z",
  "instantReadingKey": "EXAMPLE_instant_reading_key_replace_me_not_real",
  "activationKey": "K7PM-3XQD-R9HT-WB2N"
}
```

> **`instantReadingKey` and `activationKey` are returned only here.** They are not stored in a readable form and cannot be fetched again. The app must show them to the user (with a copy button) or hand them to the provisioning step immediately. If the activation key is lost, [rotate it](#rotate-the-activation-key). If the instant reading key is lost, the device must be re-registered under a new MAC or by the Baruch team.

Registration is all-or-nothing: if any check fails, nothing is stored. For factory units, a successful registration also changes the product's `status` to `SHIPPED` and adds `deviceId` to the product record.

| Status | Message |
|--------|---------|
| `400` | `macAddress is required.` / `macAddress must be 12 hex digits, for example AA:BB:CC:DD:EE:FF.` / `macAddress must not be all zeros or all ones.` |
| `400` | `serialNumber must look like BMS-2026-000001.` |
| `400` | `Give a serialNumber for a factory unit, or a manufacturer for an external one.` |
| `400` | `manufacturer must be 1 to 64 characters.` / `model must be 1 to 64 characters.` / `firmwareVersion must look like 1.4.2.` |
| `403` | `Only administrators can do this.` |
| `404` | `No product with serial number BMS-2026-000009.` |
| `409` | `Product BMS-2026-000001 is retired and cannot be registered.` |
| `409` | `A device with MAC address AA:BB:CC:DD:EE:01 is already registered.` |
| `409` | `Product BMS-2026-000001 has already been registered as a device.` |

---

## Read one device

`GET /devices/{deviceId}`

```bash
curl -s "$BASE/devices/dev_01JCMK3Q7X8R2N5VBHT9AZW4E6" -H "Authorization: Bearer <idToken>"
```

Returns the device record (no secrets).

| Status | Message |
|--------|---------|
| `400` | `deviceId must look like dev_ followed by 26 characters.` |
| `404` | `No device with that id.` |

---

## Find a device

`GET /devices?mac=AA:BB:CC:DD:EE:01` or `GET /devices?serial=BMS-2026-000001`. Exactly one of the two.

```bash
curl -s "$BASE/devices?mac=aa-bb-cc-dd-ee-01" -H "Authorization: Bearer <idToken>"
curl -s "$BASE/devices?serial=bms-2026-000001" -H "Authorization: Bearer <idToken>"
```

Both inputs are normalised, so any MAC format and lower-case serials work. Returns a single device record (not a list).

Typical use: the app scans a QR code or reads the MAC over Bluetooth, then calls `?mac=` to show the matching device.

| Status | Message |
|--------|---------|
| `400` | `Provide ?mac= or ?serial=.` / `Search by mac or serial, not both.` |
| `400` | `macAddress must be 12 hex digits, for example AA:BB:CC:DD:EE:FF.` / `serial must look like BMS-2026-000001.` |
| `404` | `No device matches.` |

---

## Rotate the activation key

`POST /devices/{deviceId}/activation-key` — Administrator only. No request body.

The previous activation key stops working immediately and `activationStatus` returns to `PENDING`.

```bash
curl -s -X POST "$BASE/devices/dev_01JCMK3Q7X8R2N5VBHT9AZW4E6/activation-key" \
  -H "Authorization: Bearer <idToken>"
```

`200 OK`:

```json
{
  "deviceId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
  "activationStatus": "PENDING",
  "updatedAt": "2026-11-13T09:00:00Z",
  "activationKey": "T4WN-8QHC-2MZP-F6RD"
}
```

Shown once, like at registration.

| Status | Message |
|--------|---------|
| `400` | `deviceId must look like dev_ followed by 26 characters.` |
| `403` | `Only administrators can do this.` |
| `404` | `No device with that id.` |

### Activation key format

Four groups of four characters separated by dashes: `XXXX-XXXX-XXXX-XXXX`. The alphabet excludes `0`, `O`, `1`, and `I` so it can be read aloud or printed without ambiguity. When a user types it in, the server will accept lower-case and missing dashes, so the app need not be strict about formatting.

---

## History of one device

`GET /devices/{deviceId}/history` — oldest first. `limit` defaults to 100, maximum 500.

```bash
curl -s "$BASE/devices/dev_01JCMK3Q7X8R2N5VBHT9AZW4E6/history" -H "Authorization: Bearer <idToken>"
```

```json
{
  "subjectId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
  "items": [
    {
      "subjectId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
      "occurredAt": "2026-11-12T15:00:00.168Z#da11c8",
      "action": "DEVICE_REGISTERED",
      "actorEmail": "admin@example.com",
      "actorRole": "Administrator",
      "details": { "macAddress": "AA:BB:CC:DD:EE:01", "serialNumber": "BMS-2026-000001" }
    },
    {
      "subjectId": "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6",
      "occurredAt": "2026-11-13T09:00:00.752Z#838685",
      "action": "ACTIVATION_KEY_ROTATED",
      "actorEmail": "admin@example.com",
      "actorRole": "Administrator"
    }
  ],
  "count": 2
}
```

| `action` | When |
|----------|------|
| `DEVICE_REGISTERED` | `POST /devices`. `details` has `macAddress` and either `serialNumber` or `manufacturer`/`model`. |
| `ACTIVATION_KEY_ROTATED` | `POST /devices/{deviceId}/activation-key`. No `details`. |

Field notes are the same as for [product history](./products.md#history-of-one-product). Keys never appear in history.

---

## Client examples

Register a device and show the one-time secrets. Assumes the helpers from [auth.md](./auth.md#client-examples).

### JavaScript / TypeScript

```ts
type Device = {
  deviceId: string; macAddress: string; origin: "FACTORY" | "EXTERNAL";
  serialNumber?: string; manufacturer?: string; model?: string; firmwareVersion?: string;
  activationStatus: string; registeredBy: string; registeredAt: string; updatedAt: string;
};
type RegisteredDevice = Device & { instantReadingKey: string; activationKey: string };

async function registerDevice(session: Session, body: { macAddress: string; serialNumber?: string; manufacturer?: string }) {
  return post<RegisteredDevice>("/devices", body, session.tokens.idToken);
}

async function findByMac(session: Session, mac: string, onSession: (s: Session) => void) {
  return authedGet<Device>(`/devices?mac=${encodeURIComponent(mac)}`, session, onSession);
}
```

### Android (Kotlin)

```kotlin
@Serializable data class Device(
    val deviceId: String, val macAddress: String, val origin: String,
    val serialNumber: String? = null, val manufacturer: String? = null, val model: String? = null,
    val firmwareVersion: String? = null, val activationStatus: String,
    val registeredBy: String, val registeredAt: String, val updatedAt: String,
    val instantReadingKey: String? = null, val activationKey: String? = null,   // only on POST /devices
)

suspend fun BaruchApi.registerFactoryDevice(session: Session, mac: String, serial: String): Device =
    post("/devices", mapOf("macAddress" to mac, "serialNumber" to serial), token = session.tokens.idToken)

suspend fun BaruchApi.findByMac(session: Session, mac: String, onSession: (Session) -> Unit): Device =
    get("/devices?mac=${Uri.encode(mac)}", session, onSession)
```

`post` in `BaruchApi` is private in the auth example; make it internal, or add these as members.

### iOS (Swift)

```swift
struct Device: Codable {
    let deviceId, macAddress, origin: String
    let serialNumber, manufacturer, model, firmwareVersion: String?
    let activationStatus, registeredBy, registeredAt, updatedAt: String
    let instantReadingKey, activationKey: String?   // only on POST /devices
}

extension BaruchAPI {
    func registerFactoryDevice(session: Session, mac: String, serial: String) async throws -> Device {
        try await post("/devices", body: ["macAddress": mac, "serialNumber": serial], token: session.tokens.idToken)
    }

    func findByMac(session: Session, mac: String, onSession: (Session) -> Void) async throws -> Device {
        let encoded = mac.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? mac
        return try await get("/devices?mac=\(encoded)", session: session, onSession: onSession)
    }
}
```

In both native examples, show `activationKey` in a monospaced font with a copy action, and never log either key.
