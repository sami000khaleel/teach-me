const executeQuery=require ('../config/db');

// Columns that may leave the server. NEVER select * from student for a
// response: the row contains the password (hash).
const PUBLIC_COLUMNS = 'id_stu, first_name_stu, last_name_stu, email_stu, image_url';

class studentmodels{
    static async getstudents_by_course_id(course_id){
      const rows = await executeQuery(
        `select ${PUBLIC_COLUMNS} from student where id_stu in (select id_stu from relater where id_cours=?)`,
        [course_id]
      );
      // the browser gets the server route, never the raw storage address
      // (built here, NOT in SQL: a "?" inside the SQL text would be taken as a placeholder)
      return rows.map((r) => ({
        ...r,
        image_url: r.image_url ? `/api/student/get_student_image?id_student=${r.id_stu}` : "",
      }));
    }

    //************************************ */

// `passwordHash` must already be a bcrypt hash (see models/credentials.js)
static async addstudent(firstname,lastname,email,passwordHash)
{

  const result= await executeQuery('insert into student (first_name_stu,last_name_stu,email_stu,password) values(?,?,?,?)',[firstname,lastname,email,passwordHash]);
  if (result)
  return {id:result.insertId,firstname:firstname,lastname:lastname,email };
}
//************************************ */
static async addImageUrl(imageUrl,studentId){
  await executeQuery(`update student set image_url=? where id_stu=?`, [imageUrl, studentId])
}

//****************************************** */

static async get_courses(){
  const res=await executeQuery('select  * from cours',[]);
  if(res)
  return res;
}

//***************************************** */


static async course_info(id_course){
  const res=await executeQuery('select  *from cours where id_cours=?',[id_course]);
  if(res)
  return res;
}


static async login_course(id_student,id_course)
{

  const result= await executeQuery('insert into relater (id_stu,id_cours) values(?,?)',[id_student,id_course]);
  if (result)
  return result;
}



// `passwordHash` must already be a bcrypt hash
static async update_password(passwordHash,id_student) {
  await executeQuery('update student set password=? where id_stu=?', [passwordHash,id_student]);
}


}
module.exports = studentmodels
