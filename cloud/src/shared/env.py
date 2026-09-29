import os


class MissingConfigError(Exception):
    def __init__(self, name: str) -> None:
        super().__init__(f"Missing environment variable {name}")


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise MissingConfigError(name)
    return value
