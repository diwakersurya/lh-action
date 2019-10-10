const db=require('./db');

const dbName='lighthouse.json';
module.exports=async function(lhData){
    const data=Object.values(lhr.categories).reduce((accumulator,cat) => {
        //const threshold = thresholds[cat.id] || '-';
        accumulator[cat.title]=cat.score;
        return accumulator;
    },{});
    //create the db
    await db.create(dbName);
    //save data to db
    await db.save(dbName,(new Date()).toISOString(),data)
}