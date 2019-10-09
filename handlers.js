const dbHandler =require("./dbHandler");
let resultHandlers=[dbHandler];

function add(handler){
    resultHandlers=[...resultHandlers,handler];
}
function getHandlers(){
    return resultHandlers
}
//TODO: add function for removing handlers;
module.exports={
    add,
    getHandlers
}