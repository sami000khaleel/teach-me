const executeQuery=require ('../config/db');

class relater_model{
static async get_students(courseId){
  let result=await executeQuery('select id_stu from relater where id_cours=? and id_stu is not ?',[courseId,null])
  result=result.map(el=>el.id_stu)
  return result
}
static async add_relation(course_id,teacher_id){
    let result= await executeQuery('insert into relater (id_cours,id_teacher) values(?,?)',[course_id,teacher_id]);
  return result;
} 

}

module.exports=relater_model;