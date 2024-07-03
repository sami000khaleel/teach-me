const executeQuery = require('../config/db');


class gett_id {
  static async findUserByCode(codeId) {
    const relatorRow = await executeQuery('select * from relater2 where id_code=?', [codeId])
    console.log(relatorRow[0])
    let response=null
    let id = null
    let user=null
    if (!relatorRow[0]?.id_stu) { 
      id = relatorRow[0].id_teacher
      response=await executeQuery('select * from teacher where id_teacher=?',[id])
      user=response[0]
    }
    if (!relatorRow[0]?.id_teacher)
    {  
      id = relatorRow[0]?.id_stu
      response=await executeQuery('select * from student where id_stu=?',[id])
      user=response[0]
    }
    return user
  }
  static async findCode(code) {
    const result = await executeQuery('select * from code where code=?', [code])
    return result[0]
  }
  static async saveCode(code, id, role) {
    console.log(id, code, role)
    const { insertId } = await executeQuery('insert into code (code,codeDate) values(?,?)', [code, new Date()]);
    console.log('codeId', insertId)
    if (role == 'teacher') {
      await executeQuery("insert into relater2 (id_,id_teacher_code) values(?,?);", [id, insertId])

    }
    if (role == 'student') {
      await executeQuery("insert into relater2 (id_stu,id_code) values(?,?);", [id, insertId]);
    }
  }
  static async student(email, password) {

    const result = await executeQuery('select id_stu from student where email_stu=? and password=?', [email, password]);
    if (!result)
      throw new Error("one field was wrong")
    return result[0];


  }
  //********************************************************************************************************** */

  static async teacher(email, password) {
    const result = await executeQuery('select * from teacher where email = ? and password=?', [email, password]);
    if (!result[0])
      throw new Error("one field was wrong")
    return result[0];


  }
  static async verifyEmail(email, role) {
    let result = null
    if (role == 'teacher')
      result = await executeQuery('select * from teacher where email = ? ', [email]);
    if (role == 'student')
      result = await executeQuery('select * from student where email_stu = ? ', [email]);
    console.log(result)
    if (!result)
      throw new Error('email was not')
    console.log(result)
    if (!result[0])
      throw new Error("one field was wrong")
    const id = result[0][Object.keys(result[0])[0]]
    return id;


  }
  //***************************************************************************** */

  //////////////////////////////////////
  static async confirm_account_teacher(id, password) {
    try {
      const result = await executeQuery('select id_teacher from teacher where id_teacher = ? and password=?', [id, password]);

      return ("htis is same teacher");
    }
    catch (err) {
      console.log(err)
      return res.status(400).json({ message: err.message })
    }

  }

  static async confirm_account_student(id, password) {
    try {
      const result = await executeQuery('select id_stu from student where id_stu = ? and password=?', [id, password]);

      return ("htis is same student");
    }
    catch (err) {
      console.log(err)
      return res.status(400).json({ message: err.message })
    }

  }

}








module.exports = gett_id




















