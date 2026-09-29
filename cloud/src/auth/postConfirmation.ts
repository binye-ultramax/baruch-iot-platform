import type { PostConfirmationTriggerHandler } from 'aws-lambda'
import { ensureOperatorGroup } from '../shared/cognito.ts'

export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event
  }

  await ensureOperatorGroup(event.userPoolId, event.userName)
  return event
}
