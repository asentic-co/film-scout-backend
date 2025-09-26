export const dbConfig = {
  // Support the DB_* environment variables used in docker-compose.yml
  // while preserving backward compatibility with MARIADB_* names.
  host: process.env.DB_HOST || process.env.MARIADB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MARIADB_PORT || process.env.MYSQL_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.MARIADB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MARIADB_DATABASE || process.env.MYSQL_DATABASE || undefined,
};