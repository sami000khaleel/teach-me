
const executeQuery = require('../config/db')
class teacher {
  static async get_teacher_id(course_id) {
    let result = await executeQuery('select id_teacher from relater where id_cours=?', [course_id])
    console.log(result)
    if (!result.length)
      throw new Error('no teacher was found')
    return result[0].id_teacher
  }
  static async get_teacher_by_id(teacher_id) {
    const result = await executeQuery('select first_name ,last_name, email, id_teacher from teacher where id_teacher=?', [teacher_id])
    return result[0]
  }
  static async get_course(course_id) {
    // await executeQuery('SELECT first_name_stu,last_name_stu,cours_name,first_cours,end_cours,date1,date2,name_teacher from cours_view where id_cours = ? ',[course_id]);  
    const result = await executeQuery('select * from cours where id_cours=? ', [course_id])
    if (!result.length)
      throw new Error('no course was found')
    return result;

  }

  //****************************************************** */


  static async add_course(course_name, course_discription, first_course, end_course, date1, date2) {


    const result = await executeQuery('insert into cours (cours_name,cours_discription,first_cours,end_cours,date1,date2) values(?,?,?,?,?,?)', [course_name, course_discription, first_course, end_course, date1, date2]);

    return result.insertId;

  }


  // `passwordHash` must already be a bcrypt hash
  static async update_password(passwordHash,id_teacher) {
    await executeQuery('update teacher set password=? where id_teacher=?', [passwordHash,id_teacher]);
}


static async add_idCourse(id_course)
{

  const result= await executeQuery('insert into lectures (id_course) values(?)',[id_course]);
  if (result) 
  return {id:result.insertId};
}
static async addlectureUrl(lectureUrl,id_lecture){
  await executeQuery(`update lectures set lecture=? where id_lecture=?`, [lectureUrl,id_lecture])
}



}
module.exports = teacher
