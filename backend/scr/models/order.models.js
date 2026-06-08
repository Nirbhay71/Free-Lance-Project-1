import mongoose from "mongoose"

const OrderSchema = new mongoose.Schema({
    orderName: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Party",
        required: true,
    }
}, { timestamps: true })

export const Order = mongoose.model('Order', OrderSchema)
