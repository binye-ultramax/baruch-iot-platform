export type AuthAction = 'register' | 'confirm' | 'login'

export class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = error.name
    if (typeof name === 'string') return name
  }
  return 'Error'
}

export function mapCognitoError(error: unknown, action: AuthAction): HttpError | null {
  const name = errorName(error)

  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') {
    return new HttpError(429, 'Too many attempts. Try again shortly.')
  }

  if (action === 'register') {
    if (name === 'UsernameExistsException' || name === 'AliasExistsException') {
      return new HttpError(409, 'An account with this email already exists.')
    }
    if (name === 'InvalidPasswordException' || name === 'InvalidParameterException') {
      return new HttpError(400, 'Check the email, name, and password and try again.')
    }
    if (name === 'CodeDeliveryFailureException') {
      return new HttpError(502, 'Could not send the confirmation email.')
    }
  }

  if (action === 'confirm') {
    if (name === 'CodeMismatchException') {
      return new HttpError(400, 'That confirmation code is not valid.')
    }
    if (name === 'ExpiredCodeException') {
      return new HttpError(400, 'That confirmation code has expired. Register again to receive a new code.')
    }
    if (name === 'UserNotFoundException') {
      return new HttpError(404, 'No account is waiting for confirmation for that email.')
    }
    if (name === 'NotAuthorizedException') {
      return new HttpError(409, 'This account is already confirmed. Sign in instead.')
    }
    if (name === 'UnexpectedLambdaException' || name === 'UserLambdaValidationException') {
      return new HttpError(500, 'Could not finish creating the account.')
    }
  }

  if (action === 'login') {
    if (name === 'UserNotConfirmedException') {
      return new HttpError(403, 'Confirm your email before signing in.')
    }
    if (name === 'PasswordResetRequiredException') {
      return new HttpError(403, 'Password reset is required.')
    }
    if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') {
      return new HttpError(401, 'Invalid email or password.')
    }
  }

  return null
}
