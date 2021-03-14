const mongoose=require("mongoose")
const schema=new mongoose.Schema({
    firstname:String,
    email:String,
    lastname:String,
    phone:String,
    address:String,
    mode_of_payment:String,
    product_category:String,
    product_brand:String,
    money_received:Number,
    session_id:String,
    date:{type:Date,default:Date.now}
})
const model=mongoose.model('customer',schema)
module.exports=model