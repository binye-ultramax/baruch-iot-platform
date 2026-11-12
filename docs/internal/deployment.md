# Deployment

Internal. How the `cloud/` stack is built and deployed. Not for distribution to app developers.

---

## What gets deployed

One CloudFormation stack, `baruch-auth`, in `eu-west-2`, defined by `cloud/template.yaml` (AWS SAM). It contains the Cognito user pool, the HTTP API, every Lambda function, the DynamoDB tables, and the KMS key. See [architecture.md](./architecture.md) for the resource list.

Stack outputs:

| Output | Meaning |
|--------|---------|
| `AuthApiUrl` | Base URL shared with app developers |
| `UserPoolId` | Cognito user pool id |
| `UserPoolClientId` | Cognito app client id. The client secret stays in the Lambda environment and is never printed. |

---

## Automatic deploy from GitHub (normal path)

`.github/workflows/deploy-auth.yml` runs on every push to `main` that touches `cloud/src`, `cloud/tests`, or `cloud/template.yaml`, and can also be started from the Actions tab.

Steps: run `python -m unittest discover -s tests` → `sam build` → `sam deploy` with `--no-fail-on-empty-changeset` → print `AuthApiUrl`.

GitHub signs in to AWS through OIDC and assumes the role `baruch-auth-github-deploy`. No AWS access keys are stored in GitHub.

Watch a run:

```bash
gh run list --workflow deploy-auth.yml --limit 3
gh run watch <run-id> --exit-status
```

Changes under `docs/` or `web/` do not trigger a deploy.

### One-time setup (already done for this account)

1. Create the deploy role:

   ```bash
   aws cloudformation deploy \
     --template-file cloud/deploy/github-deploy-role.yaml \
     --stack-name baruch-auth-github-deploy \
     --capabilities CAPABILITY_NAMED_IAM \
     --region eu-west-2
   ```

2. Save the `DeployRoleArn` output as the repository variable `AWS_DEPLOY_ROLE_ARN`:

   ```bash
   gh variable set AWS_DEPLOY_ROLE_ARN --body "arn:aws:iam::<account-id>:role/baruch-auth-github-deploy"
   ```

3. Optional: set `AUTH_CORS_ORIGIN` to the dashboard origin. Defaults to `*`.

The role trusts only workflow runs from `main` of this repository and can only change the `baruch-auth` stack and the resources inside it (CloudFormation, Lambda, API Gateway, Cognito, DynamoDB tables named `Bms*`, IAM roles named `baruch-auth-*`, KMS, logs, and the SAM artifact bucket).

**When the template needs a new AWS service**, the role must be granted that service first. Edit `cloud/deploy/github-deploy-role.yaml`, re-run step 1, then push. Otherwise the workflow fails with an `AccessDenied` from CloudFormation.

### If the role cannot be assumed

`Not authorized to perform sts:AssumeRoleWithWebIdentity` means the OIDC subject claim does not match. Check what GitHub sends:

```bash
gh api repos/OWNER/REPO/actions/oidc/customization/sub
```

When `use_immutable_subject` is `true`, the claim has the form `owner@ownerId/repo@repoId`. Pass that as the `GitHubImmutableRepository` parameter when deploying the role template.

---

## Manual deploy from a laptop

Requires AWS CLI, AWS SAM CLI, Python 3.12, and credentials for the account.

```bash
cd cloud
python -m unittest discover -s tests
sam validate --lint
sam build
sam deploy --guided        # first time; writes samconfig.toml
sam deploy                 # thereafter
```

`cloud/samconfig.toml.example` holds the expected defaults (stack `baruch-auth`, region `eu-west-2`). `samconfig.toml` is git-ignored.

Prefer the GitHub path for anything that lands on `main`, so the deployed stack always matches the branch.

---

## Data safety

- All DynamoDB tables, the Cognito user pool, and the KMS key have `DeletionPolicy: Retain`. Deleting the stack leaves the data in place.
- `BmsProducts`, `BmsDevices`, and `BmsAuditLog` have point-in-time recovery on.
- DynamoDB keys cannot be changed in place. Changing a table's key schema means a new logical resource with a new table name, a data copy, and manual deletion of the old table once it is confirmed empty or migrated.

---

## Administrators

New accounts are Operators. To promote someone:

```bash
aws cognito-idp admin-add-user-to-group \
  --region eu-west-2 \
  --user-pool-id <UserPoolId> \
  --username <email> \
  --group-name Administrator
```

The change takes effect at their next sign-in or token refresh.

---

## Useful checks after a deploy

```bash
aws apigatewayv2 get-routes --region eu-west-2 --api-id <ApiId> \
  --query "sort_by(Items,&RouteKey)[].RouteKey" --output text

aws dynamodb list-tables --region eu-west-2 --query "TableNames[?starts_with(@, 'Bms')]"

aws logs tail /aws/lambda/baruch-auth-register-device --region eu-west-2 --since 10m
```

Function names are `baruch-auth-<name>`: `register`, `confirm`, `login`, `refresh`, `post-confirmation`, `create-product`, `get-product`, `list-products`, `product-history`, `audit-by-actor`, `register-device`, `get-device`, `find-device`, `rotate-activation-key`, `device-history`.
