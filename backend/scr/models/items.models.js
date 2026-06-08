import mongoose from "mongoose"

const ItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        trim: true,
        default: ""
    },
    color: {
        type: String,
        enum: ["gold", "rose gold", "black"],
        required: true,
    },
    size_length: {
        type: Number,
        required: true,
    },
    size_width: {
        type: Number,
        required: true,
    },
    photo: {
        type: String,
        default: ""
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Party",
        required: true,
    },
    quantityArrived: {
        type: Number,
        default: 0,
        required: true,
    },
    quantityCompleted: {
        type: Number,
        default: 0,
        required: true,
    },
    quantityRejected: {
        type: Number,
        default: 0,
        required: true,
    },
    outgoingDate: {
        type: Date,
    }
}, { timestamps: true })

export const Item = mongoose.model('Item', ItemSchema)