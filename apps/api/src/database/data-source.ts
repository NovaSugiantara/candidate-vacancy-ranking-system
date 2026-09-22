import 'dotenv/config';

import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config';

const dataSource = new DataSource({
  ...databaseConfig(),
  entities: [join(__dirname, '../**/*.entity.{js,ts}')],
  migrations: [join(__dirname, 'migrations/*.{js,ts}')],
  synchronize: false,
});

export default dataSource;
