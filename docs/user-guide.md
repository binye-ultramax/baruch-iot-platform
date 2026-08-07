# User Guide

Guide for using the Baruch IoT Platform web dashboard.

---

## Getting started

### Run locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Sign in

Use one of the mock accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@baruch.io | admin123 | Administrator |
| operator@baruch.io | baruch2025 | Operator |

After signing in you are redirected to the **Device Fleet** page.

---

## Device Fleet page

**Path:** `/devices`

The fleet page has two panels:

### Device list (left)

- Shows all gateways with name, model, SOC, address, group, and status
- **Status colors:** green (online), amber (warning), gray (offline)
- Hover a device to highlight its marker on the map
- Click a device to open its detail dashboard

### Map (right)

- OpenStreetMap view centered on New York
- Purple markers for each device
- Click a marker to open a popup with SOC, status, and **View details** link

### Header actions

- **Profile** — open your user profile
- **Sign out** — end session and return to login

---

## Device detail page

**Path:** `/devices/:deviceId` (e.g. `/devices/dev-01`)

### Navigation

- **Back to device list** — return to fleet view
- **Profile** — open user profile

### Sidebar

- Breadcrumb: `Devices > dev-01`
- Device summary: model, age, primary group
- **State of Charge** badge and segmented battery bar
- Last data update and associated group
- **Device details** (expandable): ID, firmware, hardware, connectivity, battery chemistry
- **Device configurations** (expandable): sampling interval, upload interval, connectivity mode, monitored packs

Drag the **right edge** of the sidebar to resize its width.

### SOC Evolution (top panel)

- 24-hour area chart of SOC (% vs time in hours)
- Toggle switches for **Current device** and **Fleet devices** (UI only in MVP)
- Stat boxes: current SOC and operating time estimate

### SOC Scorecard (bottom left)

- Donut chart showing current SOC
- Battery energy bar (kWh used / total capacity)
- Five health metrics with progress bars:
  - Estimated runtime
  - Network signal
  - Cell balance
  - Temperature status
  - Data reporting

### Cell Information (bottom right)

- Pack label (e.g. Pack A)
- Summary: cell count, min/max voltage, delta, average temperature
- 16-cell grid with voltage and balance indicator
- Balance status footer

Drag the **bottom-right corner** of the scorecard and cell panels to resize their height.

---

## User profile page

**Path:** `/profile`

- View account details: name, email, role, department, phone, timezone
- Toggle notification preferences (saved locally in MVP only)
- Security section shows login email and recovery phone (read-only)

---

## Keyboard and accessibility

- Tab through links, buttons, and form fields
- Toggle switches activate with click/Enter
- Accordion sections expand/collapse on click

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redirected to login | Session expired; sign in again |
| Device not found | Invalid URL; use fleet list to select a device |
| Map not loading | Check network access to OpenStreetMap tile servers |
| Blank chart | Refresh page; ensure JavaScript is enabled |

---

## Production notes

This MVP uses **mock data only**. Values do not reflect live devices. Do not use mock credentials in production environments.
