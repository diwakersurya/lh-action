const axios=require('axios');
const url="https://thetechlead-db-bot.glitch.me/thetechlead/db/";
async function save(db,key,value){
    return axios.put(`${url}/${db}`, {
    key,value
  })
}

async function get(db,key){
    return axios.get(`${url}/${db}`);
}

async function create(db){
    return axios.post(`${url}/${db}`)
}

module.exports={save,get,create};