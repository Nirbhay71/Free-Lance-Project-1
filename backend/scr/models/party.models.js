import mongoose from "mongoose"

const PartySchema = new mongoose.Schema({
    partyName: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    paymentReceived: {
        type: Number,
        default: 0
    },
    paymentsHistory: [
        {
            amount: { type: Number, required: true },
            date: { type: Date, default: Date.now },
            note: { type: String, default: "" }
        }
    ]
}, { timestamps: true })

// Ensure partyName is unique per user (compound unique index)
PartySchema.index({ partyName: 1, createdBy: 1 }, { unique: true })

export const Party = mongoose.model("Party", PartySchema)