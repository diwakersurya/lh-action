const axios=require('axios');
const url="https://thetechlead-db-bot.glitch.me/thetechlead/db/";
async function save(db,key,value){
    return axios.put(`${url}/${dbName}`, {
    key,value
  })
}

async function get(db,key){
    return axios.get(`${url}/${dbName}`;
}

async function create(db){
    return axios.post(`${url}/${dbName}`)
}

module.exports={save,get,create};