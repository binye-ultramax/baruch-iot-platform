from shared.cognito import ensure_operator_group


def handler(event, context):
    if event.get("triggerSource") != "PostConfirmation_ConfirmSignUp":
        return event

    ensure_operator_group(event["userPoolId"], event["userName"])
    return event
