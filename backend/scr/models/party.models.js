import mongoose from "mongoose"

const PartySchema = new mongoose.Schema({
    partyName : {
        type : String,
        required : true
    },
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    }
},{timestamps:true})

// Ensure partyName is unique per user (compound unique index)
PartySchema.index({ partyName: 1, createdBy: 1 }, { unique: true })

export const Party = mongoose.model("Party", PartySchema)