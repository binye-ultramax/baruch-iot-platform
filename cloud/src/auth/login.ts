import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { login } from '../shared/cognito.ts'
import { json, readJsonBody, respondToError } from '../shared/http.ts'
import { parseLoginBody } from '../shared/validate.ts'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const input = parseLoginBody(readJsonBody(event))
    const session = await login(input.email, input.password)
    return json(200, session)
  } catch (error) {
    return respondToError(error, 'login')
  }
}
