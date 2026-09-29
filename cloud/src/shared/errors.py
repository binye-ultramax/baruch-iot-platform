from typing import Literal

AuthAction = Literal["register", "confirm", "login"]


class HttpError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


def error_name(error: object) -> str:
    response = getattr(error, "response", None)
    if isinstance(response, dict):
        code = response.get("Error", {}).get("Code")
        if isinstance(code, str):
            return code

    name = getattr(error, "name", None)
    if isinstance(name, str):
        return name

    if isinstance(error, BaseException):
        return type(error).__name__
    return "Error"


def map_cognito_error(error: object, action: AuthAction) -> HttpError | None:
    name = error_name(error)

    if name in ("TooManyRequestsException", "LimitExceededException"):
        return HttpError(429, "Too many attempts. Try again shortly.")

    if action == "register":
        if name in ("UsernameExistsException", "AliasExistsException"):
            return HttpError(409, "An account with this email already exists.")
        if name in ("InvalidPasswordException", "InvalidParameterException"):
            return HttpError(400, "Check the email, name, and password and try again.")
        if name == "CodeDeliveryFailureException":
            return HttpError(502, "Could not send the confirmation email.")

    if action == "confirm":
        if name == "CodeMismatchException":
            return HttpError(400, "That confirmation code is not valid.")
        if name == "ExpiredCodeException":
            return HttpError(
                400,
                "That confirmation code has expired. Register again to receive a new code.",
            )
        if name == "UserNotFoundException":
            return HttpError(404, "No account is waiting for confirmation for that email.")
        if name == "NotAuthorizedException":
            return HttpError(409, "This account is already confirmed. Sign in instead.")
        if name in ("UnexpectedLambdaException", "UserLambdaValidationException"):
            return HttpError(500, "Could not finish creating the account.")

    if action == "login":
        if name == "UserNotConfirmedException":
            return HttpError(403, "Confirm your email before signing in.")
        if name == "PasswordResetRequiredException":
            return HttpError(403, "Password reset is required.")
        if name in ("NotAuthorizedException", "UserNotFoundException"):
            return HttpError(401, "Invalid email or password.")

    return None
