const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "airbnb_development1"}\``
  );

  await conn.end();
  console.log("Database ensured");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});