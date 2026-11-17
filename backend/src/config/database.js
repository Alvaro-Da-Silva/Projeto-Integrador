import pg from 'pg';

const { Pool } = pg;

const poolOptions = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD
    };

if (process.env.PGSSLMODE === 'require') {
  poolOptions.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolOptions);
