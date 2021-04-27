# AWS RDS Data-API Seeder

## Installation

```shell
npm install --save-dev aws-rds-data-api-seeder
```

## Usage

### Standard

```shell
> npx ./scripts/seeds/users.js \
  --database my_database \
  --resource-arn arn:aws:rds:us-east-2:123456789012:cluster:my-aurora-cluster-1 \
  --secret-arn arn:aws:secretsmanager:us-west-2:123456789012:secret:my-path/my-secret-name-1a2b3c
```

### Alternate Profile

In order to use a profile other than the `default` one configured in your `.aws` directory you need to specify the name via `AWS_PROFILE` environment variable.

Additionally you will need to specify `AWS_SDK_LOAD_CONFIG=1` ([see AWS docs](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-region.html#setting-region-config-file)) to be able to load config from the `.aws/config` file.

```shell
> AWS_SDK_LOAD_CONFIG=1 AWS_PROFILE=my-profile-name npx ./scripts/seeds/users.js \
  --database my_database \
  --resource-arn arn:aws:rds:us-east-2:123456789012:cluster:my-aurora-cluster-1 \
  --secret-arn arn:aws:secretsmanager:us-west-2:123456789012:secret:my-path/my-secret-name-1a2b3c
```

### TypeScript

```shell
> npx ts-node ./scripts/seeds/users.ts \
  --database my_database \
  --resource-arn arn:aws:rds:us-east-2:123456789012:cluster:my-aurora-cluster-1 \
  --secret-arn arn:aws:secretsmanager:us-west-2:123456789012:secret:my-path/my-secret-name-1a2b3c
```

## Help

```shell
> npx ./scripts/seeds/users.js --help
Usage: seeder [options]

Options:
  -d, --database <database name>     The name of the database to connect to. Can also by set by the SEED_DATABASE environment variable.
  -q, --schema <database name>       The name of the schema to use. Can also be set by the SEED_SCHEMA environment variable. (default: "public")
  -r, --resource-arn <resource arn>  The resource ARN of the database cluster. Can also be set by the SEED_RESOURCE_ARN environment variable.
  -s, --secret-arn <secret arn>      The secret ARN to give for the seed credentials. Can also be set by the SEED_SECRET_ARN environment variable.
  --region <region>                  The AWS region the cluster is in. Can also by set by the AWS_REGION environment variable.
  -n, --dry-run                      Rolls back the transaction instead of committing. Useful for testing operations.
  -vvv, --verbose                    Enable verbose logging.
  -h, --help                         display help for command
```
