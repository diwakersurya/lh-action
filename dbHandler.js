const db=require('db');

const dbName='lighthouse.json';
module.exports=async function(lhData){
    //create the db
    await db.create(dbName);
    await db.save(dbName,(new Date()).toISOString(),lhData)
}