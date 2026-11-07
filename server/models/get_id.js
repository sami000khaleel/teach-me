const executeQuery = require('../config/db');

// Account-recovery codes (e-mail) — short lived and single use.
//   saveCode    → store a new code for an account
//   findCode    → look a code up (only if younger than 15 minutes)
//   consumeCode → delete it after use
// The date comparison is done by MySQL itself (NOW()) so there is no
// time-zone mismatch between Node and the database.
const CODE_TTL_MINUTES = 15;

class gett_id {
  // Returns { role, row } for the account a recovery code belongs to, or null
  static async findUserByCode(codeId) {
    const [relation] = await executeQuery(
      'select id_stu, id_teacher from relater2 where id_code=? limit 1',
      [codeId]
    );
    if (!relation) return null;

    if (relation.id_stu) {
      const [row] = await executeQuery('select * from student where id_stu=?', [relation.id_stu]);
      return row ? { role: 'student', row } : null;
    }
    if (relation.id_teacher) {
      const [row] = await executeQuery('select * from teacher where id_teacher=?', [relation.id_teacher]);
      return row ? { role: 'teacher', row } : null;
    }
    return null;
  }

  static async findCode(code) {
    const result = await executeQuery(
      `select * from code where code=? and codeDate >= (NOW() - INTERVAL ${CODE_TTL_MINUTES} MINUTE) order by idcode desc limit 1`,
      [String(code)]
    );
    return result[0];
  }

  static async saveCode(code, id, role) {
    const { insertId } = await executeQuery(
      'insert into code (code, codeDate) values(?, NOW())',
      [String(code)]
    );
    if (role == 'teacher') {
      await executeQuery('insert into relater2 (id_teacher, id_code) values(?,?)', [id, insertId]);
    }
    if (role == 'student') {
      await executeQuery('insert into relater2 (id_stu, id_code) values(?,?)', [id, insertId]);
    }
  }

  static async consumeCode(codeId) {
    await executeQuery('delete from relater2 where id_code=?', [codeId]);
    await executeQuery('delete from code where idcode=?', [codeId]);
  }

  // Returns the account id for an e-mail, or throws if there is none
  static async verifyEmail(email, role) {
    let result = [];
    if (role == 'teacher')
      result = await executeQuery('select id_teacher as id from teacher where email = ?', [email]);
    if (role == 'student')
      result = await executeQuery('select id_stu as id from student where email_stu = ?', [email]);
    if (!result[0])
      throw new Error('no account was found with this email');
    return result[0].id;
  }
}

module.exports = gett_id;
