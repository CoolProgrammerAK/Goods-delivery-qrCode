const mongoose=require("mongoose")

const schema=new mongoose.Schema({
    profile:String,
    name:String,
    phone:String,
    license:String,
    vehicle:String,
    verified:{default:false,type:Boolean},
    price:String,
    date:{type:Date,default:Date.now}


})
const model=mongoose.model('vehicle',schema)
module.exports=model