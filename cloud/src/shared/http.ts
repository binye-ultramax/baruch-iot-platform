import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { mapCognitoError, type AuthAction, errorName, HttpError } from './errors.ts'

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function readJsonBody(event: { body?: string | null; isBase64Encoded?: boolean }): unknown {
  if (!event.body) {
    throw new HttpError(400, 'Request body is required.')
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body

  if (raw.length > 8_192) {
    throw new HttpError(400, 'Request body is too large.')
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new HttpError(400, 'Request body must be JSON.')
  }
}

export function respondToError(error: unknown, action: AuthAction): APIGatewayProxyStructuredResultV2 {
  if (error instanceof HttpError) {
    return json(error.statusCode, { message: error.message })
  }

  const mapped = mapCognitoError(error, action)
  if (mapped) {
    return json(mapped.statusCode, { message: mapped.message })
  }

  const name = errorName(error)
  if (name === 'MissingConfigError' && error instanceof Error) {
    console.error(JSON.stringify({ action, error: name, message: error.message }))
  } else {
    console.error(JSON.stringify({ action, error: name }))
  }

  return json(500, { message: 'Something went wrong.' })
}
