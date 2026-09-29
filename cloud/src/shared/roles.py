OPERATOR_GROUP = "Operator"
ADMINISTRATOR_GROUP = "Administrator"


def role_from_groups(groups: list[str]) -> str:
    if ADMINISTRATOR_GROUP in groups:
        return ADMINISTRATOR_GROUP
    return OPERATOR_GROUP
