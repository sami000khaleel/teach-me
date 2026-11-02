// create-tables.js — recreate TeachMe database + tables + view + data
// Run: node create-tables.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB = {
  host: 'mysql-3bac93a2-samihellstrong-fa30.a.aivencloud.com',
  port: 13397,
  user: 'avnadmin',
  password: 'AVNS_swQ2st22HXmH5nRHsI_',
  // database: 'TeachMe',   <-- removed: DB is created below
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
    rejectUnauthorized: true,
  },
};

const DB_NAME = 'TeachMe';

// Order respects foreign keys: code before relater2, cours/student/teacher before relater/lectures.
const DDL = [
  // 1. teacher
  `CREATE TABLE IF NOT EXISTS \`teacher\` (
    \`id_teacher\` int NOT NULL AUTO_INCREMENT,
    \`first_name\` varchar(45) NOT NULL,
    \`last_name\` varchar(45) NOT NULL,
    \`password\` varchar(45) NOT NULL,
    \`email\` varchar(45) NOT NULL,
    PRIMARY KEY (\`id_teacher\`),
    UNIQUE KEY \`password_UNIQUE\` (\`password\`),
    UNIQUE KEY \`email_UNIQUE\` (\`email\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 2. student
  `CREATE TABLE IF NOT EXISTS \`student\` (
    \`id_stu\` int NOT NULL AUTO_INCREMENT,
    \`first_name_stu\` varchar(45) NOT NULL,
    \`last_name_stu\` varchar(45) NOT NULL,
    \`password\` varchar(45) NOT NULL,
    \`email_stu\` varchar(200) NOT NULL,
    \`image_url\` varchar(200) DEFAULT NULL,
    PRIMARY KEY (\`id_stu\`),
    UNIQUE KEY \`password_UNIQUE\` (\`password\`),
    UNIQUE KEY \`email_stu_UNIQUE\` (\`email_stu\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=168 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 3. cours
  `CREATE TABLE IF NOT EXISTS \`cours\` (
    \`id_cours\` int NOT NULL AUTO_INCREMENT,
    \`cours_name\` varchar(45) NOT NULL,
    \`cours_discription\` varchar(500) DEFAULT NULL,
    \`first_cours\` date DEFAULT NULL,
    \`end_cours\` date DEFAULT NULL,
    \`date1\` varchar(100) DEFAULT NULL,
    \`date2\` varchar(100) DEFAULT NULL,
    \`hours\` int DEFAULT NULL,
    PRIMARY KEY (\`id_cours\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 4. code (referenced by relater2)
  `CREATE TABLE IF NOT EXISTS \`code\` (
    \`idcode\` int NOT NULL AUTO_INCREMENT,
    \`code\` varchar(45) DEFAULT NULL,
    \`codeDate\` date DEFAULT NULL,
    PRIMARY KEY (\`idcode\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 5. relater
  `CREATE TABLE IF NOT EXISTS \`relater\` (
    \`id_relater\` int NOT NULL AUTO_INCREMENT,
    \`id_stu\` int DEFAULT NULL,
    \`id_teacher\` int DEFAULT NULL,
    \`id_cours\` int DEFAULT NULL,
    PRIMARY KEY (\`id_relater\`),
    UNIQUE KEY \`id_timer_UNIQUE\` (\`id_relater\`),
    KEY \`idd_stu_idx\` (\`id_stu\`),
    KEY \`idd_teacher_idx\` (\`id_teacher\`),
    KEY \`idd_cours_idx\` (\`id_cours\`),
    CONSTRAINT \`idd_cours\` FOREIGN KEY (\`id_cours\`) REFERENCES \`cours\` (\`id_cours\`),
    CONSTRAINT \`idd_stu\` FOREIGN KEY (\`id_stu\`) REFERENCES \`student\` (\`id_stu\`),
    CONSTRAINT \`idd_teacher\` FOREIGN KEY (\`id_teacher\`) REFERENCES \`teacher\` (\`id_teacher\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 6. relater2
  `CREATE TABLE IF NOT EXISTS \`relater2\` (
    \`idrelater2\` int NOT NULL AUTO_INCREMENT,
    \`id_stu\` int DEFAULT NULL,
    \`id_teacher\` int DEFAULT NULL,
    \`id_code\` int DEFAULT NULL,
    PRIMARY KEY (\`idrelater2\`),
    UNIQUE KEY \`idrelater2_UNIQUE\` (\`idrelater2\`),
    KEY \`id_stu_idx\` (\`id_stu\`),
    KEY \`id_teacher_idx\` (\`id_teacher\`),
    KEY \`id_code_idx\` (\`id_code\`),
    CONSTRAINT \`id_code\` FOREIGN KEY (\`id_code\`) REFERENCES \`code\` (\`idcode\`),
    CONSTRAINT \`id_stu\` FOREIGN KEY (\`id_stu\`) REFERENCES \`student\` (\`id_stu\`),
    CONSTRAINT \`id_teacher\` FOREIGN KEY (\`id_teacher\`) REFERENCES \`teacher\` (\`id_teacher\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // 7. lectures
  `CREATE TABLE IF NOT EXISTS \`lectures\` (
    \`id_lecture\` int NOT NULL AUTO_INCREMENT,
    \`lecture\` varchar(500) DEFAULT NULL,
    \`id_course\` int DEFAULT NULL,
    PRIMARY KEY (\`id_lecture\`),
    UNIQUE KEY \`id_lecture_UNIQUE\` (\`id_lecture\`),
    KEY \`id_course_idx\` (\`id_course\`),
    CONSTRAINT \`id_course\` FOREIGN KEY (\`id_course\`) REFERENCES \`cours\` (\`id_cours\`)
  ) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
];

// Data from the dumps. INSERT IGNORE makes re-runs safe.
const DATA = [
  `INSERT IGNORE INTO \`teacher\` VALUES (100,'sami','khaleel','242','samihellstrong@gmail.com')`,
  `INSERT IGNORE INTO \`student\` VALUES (167,'sami','khaleel','242','sami000khaleel@gmail.com','/api/student/image?studentId=167&imageName=1790278859077sami khaleel.jpg')`,
  `INSERT IGNORE INTO \`cours\` VALUES (108,'java','java fundamentals','2026-09-10','2029-01-29','Thursday 10:00 AM','Saturday 3:00 PM',NULL)`,
  `INSERT IGNORE INTO \`relater\` VALUES (173,NULL,100,108),(174,167,NULL,108)`,
];

// View: no DEFINER clause — Aiven's avnadmin can't create objects owned by root.
const VIEW = `
  CREATE OR REPLACE VIEW \`cours_view\` AS
  SELECT
    \`relater\`.\`id_relater\`      AS \`id_relater\`,
    \`student\`.\`first_name_stu\`  AS \`first_name_stu\`,
    \`student\`.\`last_name_stu\`   AS \`last_name_stu\`,
    \`cours\`.\`id_cours\`          AS \`id_cours\`,
    \`cours\`.\`cours_name\`        AS \`cours_name\`,
    \`cours\`.\`first_cours\`       AS \`first_cours\`,
    \`cours\`.\`end_cours\`         AS \`end_cours\`,
    \`cours\`.\`date1\`             AS \`date1\`,
    \`cours\`.\`date2\`             AS \`date2\`,
    \`teacher\`.\`first_name\`      AS \`name_teacher\`
  FROM \`relater\`
  LEFT JOIN \`student\` ON \`relater\`.\`id_stu\`     = \`student\`.\`id_stu\`
  LEFT JOIN \`cours\`   ON \`relater\`.\`id_cours\`   = \`cours\`.\`id_cours\`
  LEFT JOIN \`teacher\` ON \`relater\`.\`id_teacher\` = \`teacher\`.\`id_teacher\`
`;

async function main() {
  console.log('→ Connecting to Aiven...');
  const conn = await mysql.createConnection(DB);
  console.log('✅ Connected');

  // Create + select the database
  console.log(`→ Creating database ${DB_NAME} (if missing)...`);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
  );
  await conn.query(`USE \`${DB_NAME}\``);
  console.log(`✅ Using ${DB_NAME}`);

  // 1. Tables
  for (const ddl of DDL) {
    const label = ddl.match(/CREATE TABLE IF NOT EXISTS \`(\w+)\`/i)?.[1];
    try {
      await conn.query(ddl);
      console.log(`✅ ${label}`);
    } catch (err) {
      console.error(`❌ ${label} failed: ${err.message}`);
      await conn.end();
      process.exit(1);
    }
  }

  // 2. Data
  for (const ins of DATA) {
    const label = ins.match(/INSERT IGNORE INTO \`(\w+)\`/i)?.[1];
    try {
      const [r] = await conn.query(ins);
      console.log(`✅ ${label} (+${r.affectedRows} rows)`);
    } catch (err) {
      console.error(`❌ ${label} data failed: ${err.message}`);
      await conn.end();
      process.exit(1);
    }
  }

  // 3. View
  try {
    await conn.query(VIEW);
    console.log('✅ cours_view');
  } catch (err) {
    console.error(`❌ cours_view failed: ${err.message}`);
    await conn.end();
    process.exit(1);
  }

  // 4. Verify
  console.log('\n→ Verifying...');
  const [tables] = await conn.query('SHOW TABLES');
  console.log('Tables:', tables.map((r) => Object.values(r)[0]).join(', '));

  for (const t of ['teacher', 'student', 'cours', 'code', 'relater', 'relater2', 'lectures']) {
    const [[c]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    console.log(`  ${t}: ${c.n} rows`);
  }

  const [viewRows] = await conn.query('SELECT * FROM cours_view');
  console.log(`  cours_view: ${viewRows.length} rows`);

  await conn.end();
  console.log(`\n✅ Done — schema + data in ${DB_NAME}`);
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});