# Auth API

How to create an account and sign in to the Baruch IoT Platform API.

The web dashboard still signs in with the mock accounts in [user-guide.md](./user-guide.md). This API is the cloud account service. It does not yet replace the dashboard login.

---

## Base URL

After the API is deployed, the base URL is the `AuthApiUrl` stack output. It looks like:

```text
https://abc123.execute-api.eu-west-2.amazonaws.com
```

Every request is `POST` with `Content-Type: application/json`. In the examples below, replace `$BASE_URL` with that value.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/register` | Create an account and email a confirmation code |
| `POST` | `/auth/confirm` | Confirm the account with that code |
| `POST` | `/auth/login` | Sign in and receive tokens |

A new account is an **Operator**. An **Administrator** is assigned in the Cognito user pool, in the `Administrator` group. Registration cannot choose that role.

---

## Create an account

`POST /auth/register`

```bash
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"operator@baruch.io\",\"password\":\"Baruch2026!\",\"name\":\"Fleet Operator\"}"
```

| Field | Required | Rules |
|-------|----------|--------|
| `email` | Yes | A valid email address. Spaces are removed and letters are lowercased. |
| `password` | Yes | 8–256 characters, with an uppercase letter, a lowercase letter, a number, and a symbol. It must not be the same as the email. |
| `name` | Yes | 1–128 characters. |

Success returns `201`:

```json
{
  "email": "operator@baruch.io",
  "confirmationRequired": true
}
```

Cognito emails a 6-digit code to that address. With Cognito’s default email sender, the account can send about 50 messages a day. A custom Amazon SES identity is required for a higher limit.

The account cannot sign in until the code is confirmed.

---

## Confirm the email

`POST /auth/confirm`

```bash
curl -s -X POST "$BASE_URL/auth/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"operator@baruch.io\",\"code\":\"123456\"}"
```

| Field | Required | Rules |
|-------|----------|--------|
| `email` | Yes | The same email used at registration. |
| `code` | Yes | The 6-digit code from the email. |

Success returns `200`:

```json
{
  "email": "operator@baruch.io",
  "confirmed": true
}
```

Confirmation also adds the user to the `Operator` group, unless they are already an Operator or an Administrator.

---

## Sign in

`POST /auth/login`

```bash
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"operator@baruch.io\",\"password\":\"Baruch2026!\"}"
```

| Field | Required | Rules |
|-------|----------|--------|
| `email` | Yes | The account email. |
| `password` | Yes | The account password. Login does not re-check the registration password rules. |

Success returns `200`:

```json
{
  "user": {
    "email": "operator@baruch.io",
    "name": "Fleet Operator",
    "role": "Operator"
  },
  "tokens": {
    "idToken": "<jwt>",
    "accessToken": "<jwt>",
    "refreshToken": "<token>",
    "expiresIn": 3600
  }
}
```

`role` is `Administrator` when the user is in the Cognito `Administrator` group. Otherwise it is `Operator`.

`expiresIn` is the access token lifetime in seconds. `refreshToken` is included when Cognito returns one. Keep the tokens on the client. Do not send the password again until the session needs to be replaced.

An unknown email and a wrong password both return the same message, so the API does not reveal whether the account exists.

---

## Errors

Failed requests return JSON:

```json
{
  "message": "Invalid email or password."
}
```

### Shared

| Status | Message | When |
|--------|---------|------|
| `400` | `Request body is required.` | The body is missing or empty. |
| `400` | `Request body must be JSON.` | The body is not valid JSON. |
| `400` | `Request body must be a JSON object.` | The JSON value is not an object. |
| `400` | `Request body is too large.` | The body is longer than 8 KB. |
| `429` | `Too many attempts. Try again shortly.` | Cognito is throttling the call. |
| `500` | `Something went wrong.` | An unexpected failure. |

### Register

| Status | Message |
|--------|---------|
| `400` | `Email is required.` |
| `400` | `Enter a valid email address.` |
| `400` | `Name is required.` |
| `400` | `Name must be 1 to 128 characters.` |
| `400` | `Password is required.` |
| `400` | `Password is too long.` |
| `400` | `Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.` |
| `400` | `Password must not match the email address.` |
| `400` | `Check the email, name, and password and try again.` |
| `409` | `An account with this email already exists.` |
| `502` | `Could not send the confirmation email.` |

### Confirm

| Status | Message |
|--------|---------|
| `400` | `Enter the 6-digit confirmation code.` |
| `400` | `That confirmation code is not valid.` |
| `400` | `That confirmation code has expired. Register again to receive a new code.` |
| `404` | `No account is waiting for confirmation for that email.` |
| `409` | `This account is already confirmed. Sign in instead.` |
| `500` | `Could not finish creating the account.` |

### Login

| Status | Message |
|--------|---------|
| `401` | `Invalid email or password.` |
| `403` | `Confirm your email before signing in.` |
| `403` | `Password reset is required.` |
| `403` | `Additional sign-in steps are required.` |

---

## Deploy

From `cloud/`, with the AWS SAM CLI installed and AWS credentials configured:

```bash
sam build
sam deploy --guided
```

`cloud/samconfig.toml.example` uses stack name `baruch-auth` and region `eu-west-2`. Copy it to `samconfig.toml` if you want those defaults. `samconfig.toml` is not committed.

Use the `AuthApiUrl` output as `$BASE_URL`. The user pool id and app client id are also stack outputs. The app client secret stays in the Lambda environment and is not printed.

### Deploy from GitHub

`.github/workflows/deploy-auth.yml` runs the unit tests and deploys the stack on every push to `main` that changes `cloud/src`, `cloud/tests`, or `cloud/template.yaml`. It can also be started by hand from the Actions tab.

GitHub signs in to AWS with a short-lived role, so no access keys are stored in GitHub. One-time setup:

1. Create the role in your AWS account:

   ```bash
   aws cloudformation deploy \
     --template-file cloud/deploy/github-deploy-role.yaml \
     --stack-name baruch-auth-github-deploy \
     --capabilities CAPABILITY_NAMED_IAM \
     --region eu-west-2
   ```

2. Read the role ARN from the stack output `DeployRoleArn` and save it as the repository variable `AWS_DEPLOY_ROLE_ARN`:

   ```bash
   gh variable set AWS_DEPLOY_ROLE_ARN --body "arn:aws:iam::<account-id>:role/baruch-auth-github-deploy"
   ```

3. Optional: set the repository variable `AUTH_CORS_ORIGIN` to the dashboard origin. It defaults to `*`.

The role only trusts workflow runs from the `main` branch of this repository, and it can only change the `baruch-auth` stack and the resources inside it.
