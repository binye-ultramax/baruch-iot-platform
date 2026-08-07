# Embedded — High-Accuracy SPMe + EKF Workflow (MCU)

Firmware for Baruch gateway devices: battery state estimation on the MCU using a Single Particle Model with Electrolyte (SPMe), Extended Kalman Filter (EKF) correction, and BQ76952 analog front-end (AFE) integration.

```text
                    ┌────────────────────────────┐
                    │       BQ76952 (AFE)        │
                    │                            │
                    │ Pack Current (CC2)         │
                    │ Voltage                    │
                    │ Temperature                │
                    │ Accumulated Charge         │
                    │ (PASSQ)                    │
                    └────────────┬───────────────┘
                                 │
                           I²C (~3 ms)
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
                  ▼                             ▼
      Current / Voltage / Temp Buffer   Accumulated Charge
                                               (PASSQ)
                  │                             │
                  │                             ▼
                  │                    Coulomb Counting
                  │                    (Independent SOC)
                  │                             │
                  ▼                             │
          Machine Learning                      │
   (Update SPMe Parameters,                     │
        EKF Q / R)                              │
                  │                             │
                  ▼                             │
            SPMe Prediction                     │
                  │                             │
      Predicted Battery States                  │
      Predicted Terminal Voltage                │
                  │                             │
                  └──────────────┬──────────────┘
                                 ▼
                 Estimation Supervisor
      (Initialization / Drift Detection /
          Plausibility / Recovery Logic)
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │    EKF Correction     │
                    │                      │
                    │ Inputs:              │
                    │ • Predicted States   │
                    │ • Predicted Voltage  │
                    │ • Measured Voltage   │
                    └─────────┬────────────┘
                              │
                              ▼
                 Corrected Battery States
                    (SOC / SOH / SOP)
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
           CAN             UART             Flash
        Vehicle/EMS      Debug Log      Data Storage
                              │
                              ▼
                    Cloud upload (LTE)
                    Baruch IoT Platform
```

## Role in the platform

| Layer | Responsibility |
|-------|----------------|
| **Embedded (this folder)** | On-device sensing, SOC/SOH/SOP estimation, local buffering |
| [`cloud/`](../cloud/) | Telemetry ingestion, storage, alerting (planned) |
| [`web/`](../web/) | Fleet dashboard and device monitoring |

Telemetry produced here (SOC, cell voltages, temperature, status) is uploaded to the cloud and displayed in the web dashboard.

## Communication

| Interface | Purpose |
|-----------|---------|
| I²C | MCU ↔ BQ76952 (current, voltage, temperature, PASSQ) |
| CAN | MCU → vehicle / EMS |
| UART (optional) | Debug / diagnostics |
| Flash | Store parameters, logs, SOC/SOH history |
| LTE | Upload telemetry to Baruch cloud (gateway) |

## Timing

| Task | Period |
|------|-------:|
| BQ76952 current update | ~3 ms |
| MCU I²C read | 3 ms |
| Machine learning update | 100 ms |
| SPMe prediction | 100 ms |
| EKF correction | 100 ms |
| PASSQ read | 250 ms–1 s |

## Estimation pipeline

1. **BQ76952 (AFE)** — Provides pack current (CC2), voltage, temperature, and accumulated charge (PASSQ).
2. **Coulomb counting** — Independent SOC estimate from PASSQ, used by the estimation supervisor.
3. **Machine learning** — Adapts SPMe parameters and EKF noise covariance (Q/R) for aging and operating conditions.
4. **SPMe prediction** — Outputs predicted battery states and terminal voltage.
5. **Estimation supervisor** — Initialization, plausibility checks, drift detection, and recovery after resets or abnormal conditions.
6. **EKF correction** — Combines SPMe prediction with measured terminal voltage to produce corrected SOC, SOH, and SOP.

## Status

This directory is reserved for gateway firmware. Implementation is planned — see [`docs/roadmap.md`](../docs/roadmap.md).

## Related documentation

- [Architecture](../docs/architecture.md)
- [Data model](../docs/data-model.md)
- [Product roadmap](../docs/roadmap.md)
