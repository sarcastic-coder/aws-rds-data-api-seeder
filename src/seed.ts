import { marshallParameterSet, Parameter } from 'aws-rds-data-marshaller/marshall';
import RDSDataService from 'aws-sdk/clients/rdsdataservice';
import chalk from 'chalk';
import { Command } from 'commander';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { finished } from 'stream/promises';

const seedCommand = new Command();

seedCommand.option('-d, --database <database name>', 'The name of the database to connect to. Can also by set by the SEED_DATABASE environment variable.');
seedCommand.option('-q, --schema <database name>', 'The name of the schema to use, only works with PostgreSQL databases. Can also be set by the SEED_SCHEMA environment variable.');
seedCommand.option('-r, --resource-arn <resource arn>', 'The resource ARN of the database cluster. Can also be set by the SEED_RESOURCE_ARN environment variable.');
seedCommand.option('-s, --secret-arn <secret arn>', 'The secret ARN to give for the seed credentials. Can also be set by the SEED_SECRET_ARN environment variable.');
seedCommand.option('--region <region>', 'The AWS region the cluster is in. Can also by set by the AWS_REGION environment variable.');
seedCommand.option('-n, --dry-run', 'Rolls back the transaction instead of committing. Useful for testing operations.');
seedCommand.option('-vvv, --verbose', 'Enable verbose logging.');

export type ConnectionConfig = {
  database: string;
  schema?: string;
  resourceArn: string;
  secretArn: string;
};

type Load = (tableName: string, columns: Record<string, Parameter.FieldDefinition>, data: Record<string, unknown>[]) => Promise<void>;
type LoadFactoryParams = {
  dryRun: boolean;
  verbose: boolean;
  connectionConfig: ConnectionConfig;
};
type LoadFactory = (params: LoadFactoryParams) => Load;

const loadFactory: LoadFactory = ({ connectionConfig, dryRun, verbose }) => async(tableName, columns, data) => {
  console.log(chalk.cyan(`Preparing to insert ${data.length} new records`));

  const client = new RDSDataService({
    region: seedCommand.opts().region || process.env.AWS_REGION,
  });

  const transactionBegin = await client
    .beginTransaction(connectionConfig)
    .promise();

  if (transactionBegin.transactionId === undefined) {
    console.log(chalk.red('Unable to start a transaction, aborting import.'));
    return;
  }

  const statement = `INSERT INTO "${tableName}" (${Object.keys(columns).join(', ')}) VALUES (${Object.keys(columns).map((column) => `:${column}`).join(', ')})`;

  if (verbose) {
    console.log(chalk.blue(`Transaction ID: ${transactionBegin.transactionId}`));
    console.log(chalk.blue(`Insert statement: ${statement}`));
  }

  const response = await client
    .batchExecuteStatement({
      ...connectionConfig,

      sql: statement,
      parameterSets: marshallParameterSet(
        columns,
        data,
      ),
      transactionId: transactionBegin.transactionId,
    })
    .promise();

  console.log(chalk.cyan(`Inserted ${response.updateResults?.length} new records.`));

  if (dryRun) {
    console.log(chalk.yellow('Rolling back changes'));

    await client
      .rollbackTransaction({
        resourceArn: connectionConfig.resourceArn,
        secretArn: connectionConfig.secretArn,
        transactionId: transactionBegin.transactionId,
      })
      .promise();
    return;
  }

  console.log(chalk.yellow('Committing changes'));

  await client
    .commitTransaction({
      resourceArn: connectionConfig.resourceArn,
      secretArn: connectionConfig.secretArn,
      transactionId: transactionBegin.transactionId,
    })
    .promise();

  console.log(chalk.green('Transaction complete'));
};

type SourceResult = Array<Record<string, unknown>>;

export const source = async(file: string): Promise<SourceResult> => {
  const rawData: SourceResult = [];

  const parser = createReadStream(file)
    .pipe(csv())
    .on('data', (data) => {
      rawData.push(data);
    });

  await finished(parser);

  return rawData;
};

export const seeder = async(): Promise<Load> => {
  seedCommand.parse(process.argv);

  const inputConnectionConfig: Partial<ConnectionConfig> = {
    database: seedCommand.opts().database || process.env.SEED_DATABASE,
    schema: seedCommand.opts().schema || process.env.SEED_SCHEMA,
    resourceArn: seedCommand.opts().resourceArn || process.env.SEED_RESOURCE_ARN,
    secretArn: seedCommand.opts().secretArn || process.env.SEED_SECRET_ARN,
  };

  const requiredConfigKeys: Array<keyof ConnectionConfig> = ['database', 'resourceArn', 'secretArn'];

  for (const key of requiredConfigKeys) {
    if (inputConnectionConfig[key] === undefined) {
      throw new Error(`Missing configuration key "${key}"`);
    }
  }

  return loadFactory({
    connectionConfig: inputConnectionConfig as ConnectionConfig,
    dryRun: seedCommand.opts().dryRun === true,
    verbose: seedCommand.opts().verbose === true,
  });
};
