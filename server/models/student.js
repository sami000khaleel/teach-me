const executeQuery=require ('../config/db');


class studentmodels{
    static async getstudents_by_course_id(course_id){
      let results =await executeQuery('select id_stu from relater where id_cours=?',[course_id])
      let students=[]
      for (let i = 0; i < results.length; i++) {
        let res=await executeQuery('select * from student where id_stu=?',[results[i].id_stu])
        if(res[0])
        students.push(res[0])
      }  
      return students
    }
    
    //************************************ */

static async addstudent(firstname,lastname,email,password)
{

  const result= await executeQuery('insert into student (first_name_stu,last_name_stu,email_stu,password) values(?,?,?,?)',[firstname,lastname,email,password]);
  if (result) 
  return {id:result.insertId,firstname:firstname,lastname:lastname,email,password };
}
//************************************ */
static async addImageUrl(imageUrl,studentId){
  await executeQuery(`update student set image_url=? where id_stu=?`, [imageUrl, studentId])
}
//**************************************** */
static async reinsert(email,password)
{
 const result = await  executeQuery('select *from student where email_stu=? and password=?',[email,password]);
  if (!result.length)
      throw new Error('student was not found')
 if(result)
return result[0];
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



static async update_password(password2,id_student) {
  const res = await executeQuery('update student set password=? where id_stu=?', [password2,id_student]);
  return res[0];
}


}
module.exports = studentmodels