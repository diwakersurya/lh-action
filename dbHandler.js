const db=require('./db');
module.exports=async function({lhr,ghInfo}){
    const data=Object.values(lhr.categories).reduce((accumulator,cat) => {
        //const threshold = thresholds[cat.id] || '-';
        accumulator[cat.title]=cat.score;
        return accumulator;
    },{});

    const {owner,repo}=ghInfo;
    const dbName=`${owner}.${repo}.lh.json`
    //create the db
    await db.create(dbName);
    //save data to db
    await db.save(dbName,(new Date()).toISOString(),data)
}