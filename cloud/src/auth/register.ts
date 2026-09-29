import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { signUp } from '../shared/cognito.ts'
import { readJsonBody, json, respondToError } from '../shared/http.ts'
import { parseRegisterBody } from '../shared/validate.ts'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const input = parseRegisterBody(readJsonBody(event))
    await signUp(input)
    return json(201, { email: input.email, confirmationRequired: true })
  } catch (error) {
    return respondToError(error, 'register')
  }
}
