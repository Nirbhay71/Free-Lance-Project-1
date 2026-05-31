import mongoose from "mongoose"

const ItemSchema = new mongoose.Schema({
    color : {
        type : String,
        enum : ["gold", "rose gold", "black"],
        required : true,
    },
    size_length : {
        type : Number,
        required : true,
    },
    size_width : {
        type : Number,
        required : true,
    },
    photo : {
        type : String,
        required : true,
    },
    paymentReceived : {
        type : Number,
        default : 0,
    },
    partyId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Party",
        required : true,
    },
    price : {
        type : Number,
        required : true,
    },
    quantityArrived : {
        type : Number,
        default : 0,
        required : true,
    },
    quantityCompleted : {
        type : Number,
        default : 0,
        required : true,
    },
    quantityRejected : {
        type : Number,
        default : 0,
        required : true,
    },
    outgoingDate : {
        type : Date,
    }
},{timestamps:true})

export const Item = mongoose.model('Item', ItemSchema)