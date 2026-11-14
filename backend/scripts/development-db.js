import fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

export const developmentEnv = {
  ...dotenv.parse(fs.readFileSync(new URL('../.env',import.meta.url))),
  ...process.env
};

export function developmentOptions() {
  const e=developmentEnv;
  const options=e.DATABASE_URL ? {connectionString:e.DATABASE_URL} : {
    host:e.PGHOST,port:e.PGPORT ? Number(e.PGPORT) : 5432,
    database:e.PGDATABASE,user:e.PGUSER,password:e.PGPASSWORD
  };
  if(e.PGSSLMODE==='require') options.ssl={rejectUnauthorized:false};
  return {...options,connectionTimeoutMillis:5000};
}

export async function assertDevelopment(client) {
  const result=await client.query('SELECT current_database() AS database');
  if(result.rows[0].database!=='siscota') throw new Error('Destino recusado: esperado siscota.');
}

export async function connectDevelopment() {
  const client=new pg.Client(developmentOptions());
  try { await client.connect(); await assertDevelopment(client); return client; }
  catch(error) { await client.end().catch(()=>{}); throw error; }
}

export async function developmentWrite(client,sql,values=[]) {
  await assertDevelopment(client);
  return client.query(sql,values);
}

export function databaseError(error) {
  return {code:error.code || 'CONFIGURATION',message:error.message,
    table:error.table,constraint:error.constraint};
}
