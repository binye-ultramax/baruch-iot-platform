# Configurable Battery-Pack EKF v0.2

A compact one-RC extended Kalman filter supporting:

- any `NsMp` connection such as 8S1P, 16S1P, or 16S2P;
- a separate EKF for every series group;
- SOC-dependent OCV, R0, R1, and C1 lookup tables;
- separate charge and discharge RC parameters;
- multiple temperature tables with SOC/temperature interpolation;
- capacity correction using SOH.

## Run

```bash
pip install numpy
python example.py
```

## Pack topology

```json
"pack": {
  "series_cells": 16,
  "parallel_cells": 1,
  "positive_current_is_discharge": true
}
```

Only the JSON changes when moving between 8S, 16S, and other topologies. For `NsMp`, supply `N` series-group voltage measurements. Each parallel group is treated as one electrically shared series position.

## Cell profile

The SOC grid is shared by all temperature tables:

```json
"soc_points": [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
```

Each temperature table contains OCV and separate charge/discharge RC arrays:

```json
"temperature_tables": [
  {
    "temperature_c": 0.0,
    "ocv_points_v": ["one value per SOC point"],
    "discharge": {
      "r0_ohm": ["one value per SOC point"],
      "r1_ohm": ["one value per SOC point"],
      "c1_f": ["one value per SOC point"]
    },
    "charge": {
      "r0_ohm": ["one value per SOC point"],
      "r1_ohm": ["one value per SOC point"],
      "c1_f": ["one value per SOC point"]
    }
  }
]
```

The strings above illustrate the schema only; replace them with measured numbers. Every parameter array must have exactly the same length as `soc_points`. Add another complete object for each tested temperature. With only one temperature table, the library clamps all requested temperatures to that table.

## Update with measurements

```python
from battery_ekf import BatteryPackEKF

battery = BatteryPackEKF.from_json("configs/lf100ma_16s1p.json")

result = battery.update(
    pack_current_a=20.0,
    series_group_voltages_v=[3.31] * 16,
    dt_s=1.0,
    temperatures_c=25.0,
)
```

`temperatures_c` may be one temperature for the pack or a list containing one value per series group.

## SOH capacity correction

Configure it in JSON:

```json
"capacity_ah": 100.0,
"soh": 0.90
```

or update it at runtime:

```python
battery.set_soh(0.90)
```

The effective 16S1P capacity then becomes 90 Ah. For 16S2P it becomes 180 Ah.

## Preparing another cell

Copy either supplied configuration and replace:

- `capacity_ah` from a capacity test;
- `ocv_points_v` from rested OCV tests;
- `r0_ohm`, `r1_ohm`, and `c1_f` from HPPC identification;
- charge and discharge tables independently if both were measured;
- each temperature table using tests performed at that temperature.

The included LF100MA profile contains only one 25 C table. Its values are commissioning estimates because EVE does not publish an EKF-ready OCV/RC dataset. They are not qualified protection parameters. Keep independent voltage, current, and temperature protection.
