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

// Index Audit: getOrdersByParty → Order.find({ partyId }).sort({ createdAt: -1 })
// A compound index on (partyId, createdAt) covers both the filter and the sort in one pass.
// Also used by aggregation pipelines in getPartyPaymentSummary → $match: { partyId }
// Write trade-off: minimal – orders are written rarely compared to how often they're read.
OrderSchema.index({ partyId: 1, createdAt: -1 })

// Index Audit: deleteOrder + updateOrder → Order.findById(orderId) → covered by default _id index.
// No additional index needed for _id lookups.

export const Order = mongoose.model('Order', OrderSchema)
