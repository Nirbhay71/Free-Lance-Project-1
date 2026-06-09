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

// ─── Index Audit ──────────────────────────────────────────────────────────────
//
// [Priority 1] Compound: (partyId, outgoingDate)
// Query: generateReportSingleParty & generateReportAllParties aggregation
//   Item.find({ partyId, outgoingDate: { $lt: startDate } })
//   Item.find({ partyId, outgoingDate: { $gte: startDate, $lt: endDate } })
// Without: COLLSCAN across ALL items for every report → primary cause of query spikes.
// With: Range scan on (partyId, outgoingDate) – near-instant regardless of data size.
// Write trade-off: Low. Items are written rarely and updated occasionally.
ItemSchema.index({ partyId: 1, outgoingDate: 1 })

// [Priority 1] Single: orderId
// Query: getOrdersByParty → Item.find({ orderId: { $in: orderIds } })
//   getPartyPaymentSummary aggregation → $lookup: items.orderId → orders._id
// Without: COLLSCAN on items collection for every order page load.
// With: Direct index scan on orderId – O(log n) lookup per order.
// Write trade-off: Low. One index entry per item write.
ItemSchema.index({ orderId: 1 })

// [Priority 2] Single: partyId (standalone – for non-date queries)
// Query: getItemFromPartyName → Item.find({ partyId })
//   getRejectedItems, getCompletedItems, getInitialItems aggregations → $match: { partyId }
// Note: The compound (partyId, outgoingDate) can satisfy partyId-only queries via prefix scan.
// A dedicated single-field index on partyId is cheaper for queries with no outgoingDate filter.
// Write trade-off: Low.
ItemSchema.index({ partyId: 1 })

// [NOT RECOMMENDED] quantityRejected standalone index
// Query: getRejectedItemsAll → $match: { quantityRejected: { $gt: 0 } }
// Reason: Low selectivity – almost all items have this field. The partyId $lookup
// filters first so a standalone quantityRejected index provides near-zero benefit.
// ─────────────────────────────────────────────────────────────────────────────

export const Item = mongoose.model('Item', ItemSchema)