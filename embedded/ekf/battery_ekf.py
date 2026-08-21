"""Configurable 1-RC EKF for arbitrary NsMp battery packs."""

import json
import numpy as np


def load_config(filename):
    with open(filename, "r", encoding="utf-8") as file:
        return json.load(file)


class CellGroupEKF:
    """EKF for one series group. State = [SOC, RC polarization voltage]."""

    def __init__(self, config):
        self.config = config
        self._validate_model()
        f = config["filter"]
        self.x = np.array([f["initial_soc"], 0.0], dtype=float)
        self.P = np.diag([f["initial_soc_std"] ** 2,
                          f["initial_rc_voltage_std_v"] ** 2])

    def _validate_model(self):
        model = self.config["cell_model"]
        n = len(model["soc_points"])
        if n < 2 or any(b <= a for a, b in zip(model["soc_points"],
                                                model["soc_points"][1:])):
            raise ValueError("soc_points must be strictly increasing")
        tables = model["temperature_tables"]
        if not tables:
            raise ValueError("At least one temperature table is required")
        temperatures = [t["temperature_c"] for t in tables]
        if len(set(temperatures)) != len(temperatures):
            raise ValueError("temperature_c values must be unique")
        for table in tables:
            if len(table["ocv_points_v"]) != n:
                raise ValueError("ocv_points_v must match soc_points length")
            for direction in ("charge", "discharge"):
                for name in ("r0_ohm", "r1_ohm", "c1_f"):
                    values = table[direction][name]
                    if len(values) != n or any(v <= 0 for v in values):
                        raise ValueError(
                            f"{direction}.{name} must contain {n} positive values"
                        )

    def _interpolate_soc(self, values, soc):
        return float(np.interp(np.clip(soc, 0.0, 1.0),
                               self.config["cell_model"]["soc_points"], values))

    def parameter(self, name, soc, temperature_c, direction=None):
        """Interpolate first by SOC and then by temperature."""
        tables = sorted(self.config["cell_model"]["temperature_tables"],
                        key=lambda item: item["temperature_c"])
        temperatures = [table["temperature_c"] for table in tables]
        if name == "ocv_points_v":
            values = [self._interpolate_soc(table[name], soc) for table in tables]
        else:
            values = [self._interpolate_soc(table[direction][name], soc)
                      for table in tables]
        return float(np.interp(temperature_c, temperatures, values))

    def ocv(self, soc, temperature_c):
        return self.parameter("ocv_points_v", soc, temperature_c)

    def docv_dsoc(self, soc, temperature_c):
        h = 0.001
        return ((self.ocv(soc + h, temperature_c)
                 - self.ocv(soc - h, temperature_c)) / (2.0 * h))

    def set_soh(self, soh):
        if not 0.0 < soh <= 1.0:
            raise ValueError("SOH must be greater than 0 and at most 1")
        self.config["cell_model"]["soh"] = float(soh)

    def update(self, pack_current_a, measured_voltage_v, dt_s, temperature_c):
        if dt_s <= 0:
            raise ValueError("dt_s must be positive")
        pack = self.config["pack"]
        model = self.config["cell_model"]
        f = self.config["filter"]

        current = float(pack_current_a)
        if not pack.get("positive_current_is_discharge", True):
            current = -current
        direction = "discharge" if current >= 0 else "charge"

        parallel = int(pack["parallel_cells"])
        cell_current = current / parallel
        usable_capacity_as = (model["capacity_ah"] * model.get("soh", 1.0)
                              * parallel * 3600.0)
        efficiency = (model.get("discharge_efficiency", 1.0)
                      if current >= 0 else model.get("charge_efficiency", 0.995))

        soc = np.clip(self.x[0] - efficiency * current * dt_s
                      / usable_capacity_as, 0.0, 1.0)
        r0 = self.parameter("r0_ohm", soc, temperature_c, direction)
        r1 = self.parameter("r1_ohm", soc, temperature_c, direction)
        c1 = self.parameter("c1_f", soc, temperature_c, direction)

        a = np.exp(-dt_s / (r1 * c1))
        rc_voltage = a * self.x[1] + r1 * (1.0 - a) * cell_current
        self.x = np.array([soc, rc_voltage])

        F = np.array([[1.0, 0.0], [0.0, a]])
        Q = np.diag([f["soc_process_variance"], f["rc_process_variance_v2"]])
        self.P = F @ self.P @ F.T + Q

        predicted_voltage = (self.ocv(self.x[0], temperature_c)
                             - r0 * cell_current - self.x[1])
        H = np.array([[self.docv_dsoc(self.x[0], temperature_c), -1.0]])
        R = f["voltage_measurement_std_v"] ** 2
        innovation = float(measured_voltage_v - predicted_voltage)
        S = (H @ self.P @ H.T + R).item()
        K = self.P @ H.T / S
        self.x += K[:, 0] * innovation
        self.x[0] = np.clip(self.x[0], 0.0, 1.0)

        # Joseph covariance update is numerically stable.
        I = np.eye(2)
        self.P = ((I - K @ H) @ self.P @ (I - K @ H).T
                  + (K @ K.T) * R)
        return {
            "soc": float(self.x[0]),
            "predicted_voltage_v": float(predicted_voltage),
            "voltage_error_v": innovation,
            "temperature_c": float(temperature_c),
            "direction": direction,
            "r0_ohm": r0,
            "r1_ohm": r1,
            "c1_f": c1,
        }


class BatteryPackEKF:
    """EKF bank for any NsMp topology configured in JSON or a dictionary."""

    def __init__(self, config):
        self.config = config
        series = int(config["pack"]["series_cells"])
        parallel = int(config["pack"]["parallel_cells"])
        if series < 1 or parallel < 1:
            raise ValueError("series_cells and parallel_cells must be positive")
        self.groups = [CellGroupEKF(config) for _ in range(series)]

    @classmethod
    def from_json(cls, filename):
        return cls(load_config(filename))

    def set_soh(self, soh):
        """Set one capacity SOH value for all series groups."""
        for group in self.groups:
            group.set_soh(soh)

    def update(self, pack_current_a, series_group_voltages_v, dt_s,
               temperatures_c=25.0):
        """Update using one voltage and either one or Ns temperatures."""
        series = len(self.groups)
        if len(series_group_voltages_v) != series:
            raise ValueError(f"Expected {series} voltage values")
        if np.isscalar(temperatures_c):
            temperatures_c = [float(temperatures_c)] * series
        if len(temperatures_c) != series:
            raise ValueError(f"Expected one temperature or {series} values")

        results = [group.update(pack_current_a, voltage, dt_s, temperature)
                   for group, voltage, temperature in zip(
                       self.groups, series_group_voltages_v, temperatures_c)]
        soc = [item["soc"] for item in results]
        return {
            "group_soc": soc,
            "pack_soc_average": float(np.mean(soc)),
            "pack_soc_minimum": float(np.min(soc)),
            "pack_soc_maximum": float(np.max(soc)),
            "predicted_pack_voltage_v": float(sum(
                item["predicted_voltage_v"] for item in results)),
            "groups": results,
        }
