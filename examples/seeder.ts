import { Parameter } from 'aws-rds-data-marshaller/marshall';
import { seeder, source } from '../src/seed';

seeder()
  .then(async(load) => {
    const data = await source(`${__dirname}/example.csv`);
    const columns = {
      id: Parameter.UUID(),
      email: Parameter.String(),
      password: Parameter.String(),
      created_at: Parameter.Timestamp(),
      updated_at: Parameter.Timestamp(),
    };

    await load('user', columns, data);
  });
