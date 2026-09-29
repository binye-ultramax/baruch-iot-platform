import {
  AdminAddUserToGroupCommand,
  AdminInitiateAuthCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { HttpError } from './errors.ts'
import { requiredEnv } from './env.ts'
import { roleFromGroups, type UserRole, OPERATOR_GROUP, ADMINISTRATOR_GROUP } from './roles.ts'
import { secretHash } from './secretHash.ts'

const client = new CognitoIdentityProviderClient({})

export interface AuthSession {
  user: {
    email: string
    name: string
    role: UserRole
  }
  tokens: {
    idToken: string
    accessToken: string
    refreshToken?: string
    expiresIn: number
  }
}

export async function signUp(input: { email: string; password: string; name: string }): Promise<void> {
  await client.send(
    new SignUpCommand({
      ClientId: requiredEnv('USER_POOL_CLIENT_ID'),
      SecretHash: secretHash(input.email),
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'name', Value: input.name },
      ],
    }),
  )
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: requiredEnv('USER_POOL_CLIENT_ID'),
      SecretHash: secretHash(email),
      Username: email,
      ConfirmationCode: code,
    }),
  )
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await client.send(
    new AdminInitiateAuthCommand({
      UserPoolId: requiredEnv('USER_POOL_ID'),
      ClientId: requiredEnv('USER_POOL_CLIENT_ID'),
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
      },
    }),
  )

  if (response.ChallengeName) {
    throw new HttpError(403, 'Additional sign-in steps are required.')
  }

  const result = response.AuthenticationResult
  if (!result?.IdToken || !result.AccessToken) {
    throw new Error('Authentication result missing tokens')
  }

  const profile = profileFromIdToken(result.IdToken)
  const groups = await listGroupNames(requiredEnv('USER_POOL_ID'), email)

  return {
    user: {
      email: profile.email ?? email,
      name: profile.name ?? email,
      role: roleFromGroups(groups),
    },
    tokens: {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      ...(result.RefreshToken ? { refreshToken: result.RefreshToken } : {}),
      expiresIn: result.ExpiresIn ?? 3600,
    },
  }
}

export async function ensureOperatorGroup(userPoolId: string, username: string): Promise<void> {
  const groups = await listGroupNames(userPoolId, username)
  if (groups.includes(OPERATOR_GROUP) || groups.includes(ADMINISTRATOR_GROUP)) {
    return
  }

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: OPERATOR_GROUP,
    }),
  )
}

async function listGroupNames(userPoolId: string, username: string): Promise<string[]> {
  const names: string[] = []
  let nextToken: string | undefined

  do {
    const page = await client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        NextToken: nextToken,
        Limit: 60,
      }),
    )
    for (const group of page.Groups ?? []) {
      if (group.GroupName) names.push(group.GroupName)
    }
    nextToken = page.NextToken
  } while (nextToken)

  return names
}

/** Reads claims from a token Cognito just issued to this Lambda. This is not a general JWT verifier. */
function profileFromIdToken(idToken: string): { email?: string; name?: string } {
  try {
    const segment = idToken.split('.')[1]
    if (!segment) return {}
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as {
      email?: unknown
      name?: unknown
    }
    return {
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    }
  } catch {
    return {}
  }
}
