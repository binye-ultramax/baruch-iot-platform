# Product Requirements Document (PRD)

**Product:** Baruch IoT Platform  
**Version:** 0.1 (MVP — mock data)  
**Last updated:** August 2025  
**Status:** In development

---

## 1. Overview

### 1.1 Problem statement

Operations teams managing distributed battery-powered IoT gateways lack a unified view of device health, state of charge (SOC), cell balance, and fleet location. Data is fragmented across tools, making it difficult to identify at-risk devices and plan maintenance.

### 1.2 Product vision

Baruch IoT Platform provides a single dashboard for monitoring gateway devices in the field — tracking battery health, connectivity, cell-level diagnostics, and fleet geography in real time.

### 1.3 Target users

| Persona | Role | Primary needs |
|---------|------|---------------|
| **Fleet Operator** | Day-to-day monitoring | Device list, map view, SOC alerts, quick device drill-down |
| **Administrator** | Platform management | Full fleet access, user settings, configuration oversight |

---

## 2. Goals and success metrics

### 2.1 Business goals

- Reduce time to identify offline or low-SOC devices
- Provide actionable cell-level diagnostics without on-site inspection
- Support fleet-wide visibility from a single web interface

### 2.2 Success metrics (future, production)

| Metric | Target |
|--------|--------|
| Mean time to detect offline device | < 5 minutes |
| Dashboard load time | < 2 seconds |
| Active operator sessions per day | Track adoption |
| Device data freshness | < 60 seconds from upload interval |

### 2.3 MVP scope (current)

The MVP delivers a **static, mock-data web dashboard** that validates UX and information architecture before backend integration.

**In scope (MVP):**

- Login with mock authentication
- Device fleet list with map
- Device detail dashboard (SOC evolution, scorecard, cell information)
- User profile page
- Responsive layout with resizable panels

**Out of scope (MVP):**

- Real device connectivity or API
- Live WebSocket updates
- Alerting and notifications delivery
- Device configuration write-back
- Multi-tenant organization management

---

## 3. User stories

### 3.1 Authentication

| ID | Story | Priority |
|----|-------|----------|
| AUTH-01 | As an operator, I can sign in with email and password so that I access the fleet dashboard | P0 |
| AUTH-02 | As a signed-in user, I am redirected to login when my session expires | P0 |
| AUTH-03 | As a user, I can sign out to end my session | P0 |

### 3.2 Device fleet

| ID | Story | Priority |
|----|-------|----------|
| FLEET-01 | As an operator, I can view all devices in a list with SOC, status, and location | P0 |
| FLEET-02 | As an operator, I can see devices on a map with markers | P0 |
| FLEET-03 | As an operator, I can hover a list item to highlight its map marker | P1 |
| FLEET-04 | As an operator, I can click a device to open its detail page | P0 |

### 3.3 Device detail

| ID | Story | Priority |
|----|-------|----------|
| DETAIL-01 | As an operator, I can view device metadata (model, firmware, connectivity, chemistry) | P0 |
| DETAIL-02 | As an operator, I can see current SOC and a segmented battery indicator | P0 |
| DETAIL-03 | As an operator, I can view SOC evolution over 24 hours on a chart | P0 |
| DETAIL-04 | As an operator, I can toggle "Current device" / "Fleet devices" on the SOC chart (UI only in MVP) | P2 |
| DETAIL-05 | As an operator, I can view an SOC scorecard with health metrics | P0 |
| DETAIL-06 | As an operator, I can view per-cell voltage and balance for a battery pack | P0 |
| DETAIL-07 | As an operator, I can resize dashboard panels to suit my workflow | P1 |

### 3.4 User profile

| ID | Story | Priority |
|----|-------|----------|
| PROFILE-01 | As a user, I can view my account details and role | P1 |
| PROFILE-02 | As a user, I can view and toggle notification preferences (local state in MVP) | P2 |

---

## 4. Functional requirements

### 4.1 Login page (`/login`)

- Email and password form with validation
- Error message on invalid credentials
- Redirect to intended page after login
- Display mock credentials for development/demo

### 4.2 Device fleet page (`/devices`)

- Header with signed-in user name and role
- Device list panel: name, model, SOC badge, address, group, status (online / warning / offline)
- Map panel: OpenStreetMap tiles, device markers, popups with SOC and link to detail
- Profile and sign-out actions in header

### 4.3 Device detail page (`/devices/:deviceId`)

- Navigation: back to fleet list, profile link
- **Sidebar:** breadcrumb, device summary, SOC widget, last update, expandable device details and configurations
- **SOC Evolution:** area chart (0–24 h, 0–100% SOC), current SOC and runtime estimate, toggle switches
- **SOC Scorecard:** donut chart, energy bar (kWh), five metric rows with progress bars
- **Cell Information:** pack summary stats, 16-cell grid with balance indicators, balance status footer

### 4.4 User profile page (`/profile`)

- Avatar initials, name, role, department
- Account details (email, phone, timezone, member since)
- Notification preference toggles
- Security section (read-only in MVP)

---

## 5. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Initial page load < 3s on broadband; chart render without visible jank |
| **Browser support** | Latest Chrome, Firefox, Edge, Safari |
| **Accessibility** | Semantic HTML, form labels, keyboard-accessible toggles and links |
| **Security (MVP)** | Session stored in `sessionStorage`; no production credential storage |
| **Security (production)** | HTTPS, secure cookies, RBAC, audit logging (future) |

---

## 6. Design requirements

- Light-mode SaaS dashboard aesthetic
- Primary accent: indigo (`#6366F1`)
- Card-based layout with rounded corners and subtle borders
- Typography: system sans-serif stack
- Icons: thin-line (Lucide)
- Charts: purple SOC line with gradient fill; donut for scorecard

---

## 7. Data requirements (MVP)

All data is mock/static. See [data-model.md](./data-model.md) for entity definitions.

- **Devices:** 8 sample gateways across New York with varied SOC and status
- **Users:** 2 mock accounts (Administrator, Operator)
- **Telemetry:** 24-hour SOC history, 16 cells per device, scorecard metrics

---

## 8. Dependencies and integrations (future)

| System | Purpose | Phase |
|--------|---------|-------|
| REST / GraphQL API | Device and telemetry data | Phase 2 |
| WebSocket | Real-time SOC and status updates | Phase 2 |
| MQTT / IoT Core | Device ingestion | Phase 3 |
| Email / SMS | Alert delivery | Phase 3 |
| Identity provider (OAuth/SAML) | Enterprise SSO | Phase 3 |

---

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock data diverges from real API shape | Rework frontend models | Define data model early; align API spec in Phase 2 |
| Chart performance with large fleets | Slow dashboards | Pagination, aggregation, virtualized lists |
| Map tile usage limits | Broken map in production | Self-hosted tiles or commercial provider |

---

## 10. Open questions

1. What alert thresholds trigger operator notifications (SOC %, offline duration)?
2. Will operators need multi-pack cell views beyond Pack A?
3. What device configuration fields are writable vs read-only?
4. Is fleet-wide SOC overlay on the evolution chart required for Phase 2?

---

## 11. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | — | — | Pending |
| Engineering Lead | — | — | Pending |
| Design | — | — | Pending |
