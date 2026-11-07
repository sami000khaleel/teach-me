// Creates the demo data in one go (safe to run more than once):
//   • teacher  samihellstrong@gmail.com     password 242
//   • student  sami000khaleel@gmail.com     password 242
//   • course 108 (created only if it does not exist yet)
//   • the teacher teaches course 108, the student is enrolled in it
//
//   node scripts/seed-demo.js
require("dotenv").config();
const executeQuery = require("../config/db");
const { hashPassword } = require("../models/credentials");

const COURSE_ID = 108;
const PASSWORD = "242";

async function upsert(table, idCol, cols, emailCol, first, last, email, hash) {
  const found = await executeQuery(`select ${idCol} as id from ${table} where ${emailCol}=?`, [email]);
  if (found.length) {
    await executeQuery(`update ${table} set password=? where ${idCol}=?`, [hash, found[0].id]);
    return found[0].id;
  }
  const r = await executeQuery(
    `insert into ${table} (${cols.join(",")},password) values (?,?,?,?)`,
    [first, last, email, hash]
  );
  return r.insertId;
}

(async () => {
  try {
    const hash = await hashPassword(PASSWORD);

    const teacherId = await upsert("teacher", "id_teacher", ["first_name", "last_name", "email"], "email",
      "Demo", "Teacher", "samihellstrong@gmail.com", hash);
    const studentId = await upsert("student", "id_stu", ["first_name_stu", "last_name_stu", "email_stu"], "email_stu",
      "Demo", "Student", "sami000khaleel@gmail.com", hash);

    const course = await executeQuery("select id_cours from cours where id_cours=?", [COURSE_ID]);
    if (!course.length) {
      await executeQuery(
        "insert into cours (id_cours,cours_name,cours_discription,first_cours,end_cours,date1,date2) values (?,?,?,?,?,?,?)",
        [COURSE_ID, "Demo class", "Live demo lesson", "2026-01-01", "2030-01-01", "Monday 10:00 AM", "Wednesday 3:00 PM"]
      );
    }

    const t = await executeQuery("select 1 from relater where id_cours=? and id_teacher=?", [COURSE_ID, teacherId]);
    if (!t.length) await executeQuery("insert into relater (id_cours,id_teacher) values (?,?)", [COURSE_ID, teacherId]);

    const s = await executeQuery("select 1 from relater where id_cours=? and id_stu=?", [COURSE_ID, studentId]);
    if (!s.length) await executeQuery("insert into relater (id_cours,id_stu) values (?,?)", [COURSE_ID, studentId]);

    console.log(`✅ teacher id ${teacherId}, student id ${studentId}, course ${COURSE_ID} ready`);
    process.exit(0);
  } catch (err) {
    console.error("❌ seed failed:", err.message);
    process.exit(1);
  }
})();
