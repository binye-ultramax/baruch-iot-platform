from battery_ekf import BatteryPackEKF

# Change only the configuration filename to use another pack topology.
battery = BatteryPackEKF.from_json("configs/lf100ma_16s1p.json")

# The voltage list length must equal series_cells in the JSON configuration.
result = battery.update(
    pack_current_a=20.0,              # positive = discharge
    series_group_voltages_v=[
    3.310, 3.309, 3.311, 3.308,
    3.310, 3.307, 3.312, 3.309,
    3.310, 3.308, 3.311, 3.309,
    3.310, 3.307, 3.312, 3.308,
],
    dt_s=1.0,
    temperatures_c=25.0,
)

print("Group SOC:", result["group_soc"])
print("Average pack SOC:", result["pack_soc_average"])
print("Minimum group SOC:", result["pack_soc_minimum"])
