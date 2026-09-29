import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { confirmSignUp } from '../shared/cognito.ts'
import { json, readJsonBody, respondToError } from '../shared/http.ts'
import { parseConfirmBody } from '../shared/validate.ts'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const input = parseConfirmBody(readJsonBody(event))
    await confirmSignUp(input.email, input.code)
    return json(200, { email: input.email, confirmed: true })
  } catch (error) {
    return respondToError(error, 'confirm')
  }
}
