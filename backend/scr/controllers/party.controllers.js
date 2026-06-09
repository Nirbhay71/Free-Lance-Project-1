import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { Party } from "../models/party.models.js"
import { Item } from "../models/items.models.js"
import { Order } from "../models/order.models.js"

const getParty = async (name, createdBy) => {
    try {
        const party = await Party.findOne({ partyName: name, createdBy })
        if (!party) {
            throw new ApiError(404, 'No such Party Name exists')
        }
        return party;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Something went wrong fetching party')
    }
}

const getAllParties = asyncHandler(async (req, res) => {
    const parties = await Party.find({ createdBy: req.user._id })
    return res.status(200).json(new ApiResponce(200, parties, "Successfully fetched all parties"))
})

const createNewParty = asyncHandler(async (req, res) => {
    const { partyName } = req.body;
    if (!partyName) throw new ApiError(400, "Party name is required")
    const party = await Party.findOne({ partyName: partyName, createdBy: req.user._id })
    if (party) throw new ApiError(409, "Party already exists under your account")
    const newParty = await Party.create({ partyName: partyName, createdBy: req.user._id })
    return res.status(200).json(new ApiResponce(200, newParty, "New party created successfully"))
})

const updatePartyName = asyncHandler(async (req, res) => {
    const oldname = req.body.oldName || req.body.oldname;
    const { newName } = req.body;
    if (!oldname || !newName) throw new ApiError(400, "Old name and new name are required")
    const party = await getParty(oldname, req.user._id)
    party.partyName = newName;
    await party.save();
    return res.status(200).json(new ApiResponce(200, party, "Party name updated successfully"))
})

const getRejectedItemsAll = asyncHandler(async (req, res) => {
    const items = await Item.aggregate([
        { $match: { quantityRejected: { $gt: 0 } } },
        {
            $lookup: {
                from: "parties",
                localField: "partyId",
                foreignField: "_id",
                as: "partyDetails"
            }
        },
        { $unwind: "$partyDetails" },
        { $match: { "partyDetails.createdBy": req.user._id } },
        {
            $group: {
                _id: "$partyDetails._id",
                partyName: { $first: "$partyDetails.partyName" },
                rejectedItemsCount: { $sum: 1 },
                totalQuantityRejected: { $sum: "$quantityRejected" }
            }
        }
    ]);
    return res.status(200).json(new ApiResponce(200, items, "Successfully fetched all parties with rejected items"))
})

const calculateTotalPrice = asyncHandler(async (req, res) => {
    const { partyName } = req.params;
    const party = await getParty(partyName, req.user._id);
    const { month, year } = req.body;
    if (!month || !year) throw new ApiError(400, "Month and year are required")

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const items = await Item.find({
        partyId: party._id,
        quantityCompleted: { $gt: 0 },
        outgoingDate: { $gte: startDate, $lt: endDate }
    });

    if (!items?.length) throw new ApiError(404, "No completed items found for this period")

    let totalPrice = 0;
    for (const item of items) {
        const order = await Order.findById(item.orderId);
        const rate = order ? order.price : 0;
        totalPrice += rate * (item.size_length * item.size_width) * item.quantityCompleted;
    }

    return res.status(200).json(new ApiResponce(200, totalPrice, "Total Price calculated successfully"))
})

const generateReportSingleParty = asyncHandler(async (req, res) => {
    const { partyName } = req.params;
    const party = await getParty(partyName, req.user._id);
    const { month, year } = req.body;
    if (!month || !year) throw new ApiError(400, "Month and year are required")

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // 1. Calculate Previous Billing & Payments (Opening Balance)
    const previousItems = await Item.find({
        partyId: party._id,
        outgoingDate: { $lt: startDate }
    });
    console.log("[Record Count] Previous Items:", previousItems.length);

    // 2. Current Month Data
    const items = await Item.find({
        partyId: party._id,
        outgoingDate: { $gte: startDate, $lt: endDate }
    });
    console.log("[Record Count] Items:", items.length);

    // Performance Optimization: Fetch all unique orderIds involved in both lists (Avoid N+1)
    const allItemOrderIds = [...new Set([
        ...previousItems.map(i => i.orderId.toString()),
        ...items.map(i => i.orderId.toString())
    ])];
    const orders = await Order.find({ _id: { $in: allItemOrderIds } });
    const ordersMap = new Map(orders.map(o => [o._id.toString(), o]));

    let previousBillingTotal = 0;
    for (const item of previousItems) {
        const order = ordersMap.get(item.orderId.toString());
        const rate = order ? order.price : 0;
        previousBillingTotal += rate * (item.size_length * item.size_width) * (item.quantityArrived - (item.quantityRejected || 0));
    }

    const previousPayments = (party.paymentsHistory || []).filter(p => new Date(p.date) < startDate).reduce((sum, p) => sum + p.amount, 0);
    const openingBalance = Number((previousBillingTotal - previousPayments).toFixed(2));

    let totalCost = 0;
    let totalRejectedCost = 0;
    let totalQuantityArrived = 0;
    let totalQuantityCompleted = 0;
    let totalQuantityRejected = 0;
    let totalQuantityPending = 0;

    const itemDetails = [];

    for (const item of items) {
        const order = ordersMap.get(item.orderId.toString());
        const rate = order ? order.price : 0;

        const itemCost = rate * (item.size_length * item.size_width) * (item.quantityArrived - (item.quantityRejected || 0));
        const rejectedCost = rate * (item.size_length * item.size_width) * (item.quantityRejected || 0);

        totalCost += itemCost;
        totalRejectedCost += rejectedCost;
        totalQuantityArrived += (item.quantityArrived || 0);
        totalQuantityCompleted += (item.quantityCompleted || 0);
        totalQuantityRejected += (item.quantityRejected || 0);

        const pendingQty = Math.max(0, (item.quantityArrived || 0) - (item.quantityCompleted || 0) - (item.quantityRejected || 0));
        totalQuantityPending += pendingQty;

        itemDetails.push({
            _id: item._id,
            itemName: item.itemName,
            color: item.color,
            size_length: item.size_length,
            size_width: item.size_width,
            price: rate,
            quantityArrived: item.quantityArrived,
            quantityCompleted: item.quantityCompleted,
            quantityRejected: item.quantityRejected,
            quantityPending: pendingQty,
            itemCost: Number(itemCost.toFixed(2)),
            rejectedCost: Number(rejectedCost.toFixed(2)),
            photo: item.photo,
            outgoingDate: item.outgoingDate
        });
    }
    console.log("[Processed Records]", previousItems.length + items.length);

    const currentPayments = (party.paymentsHistory || []).filter(p => new Date(p.date) >= startDate && new Date(p.date) < endDate).reduce((sum, p) => sum + p.amount, 0);
    const closingBalance = openingBalance + totalCost - currentPayments;

    const responseData = new ApiResponce(200, {
        partyName: party.partyName,
        openingBalance: openingBalance > 0 ? openingBalance : 0,
        totalCost: Number(totalCost.toFixed(2)), // Billing for this month
        totalPaymentReceived: Number(currentPayments.toFixed(2)), // Payments in this month
        totalPaymentPending: closingBalance > 0 ? Number(closingBalance.toFixed(2)) : 0,
        totalRejectedCost: Number(totalRejectedCost.toFixed(2)),
        totalQuantityArrived,
        totalQuantityCompleted,
        totalQuantityRejected,
        totalQuantityPending,
        items: itemDetails
    }, "Single Party Report generated successfully");

    const serializationStart = performance.now();
    const payload = JSON.stringify(responseData);
    const serializationEnd = performance.now();
    console.log(`[JSON Serialization] ${(serializationEnd - serializationStart).toFixed(3)} ms`);
    console.log("[Payload Size]", (Buffer.byteLength(payload) / 1024).toFixed(2), "KB");

    return res.status(200).json(responseData)
})

const generateReportAllParties = asyncHandler(async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) throw new ApiError(400, "Month and year are required")

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const parties = await Party.find({ createdBy: req.user._id });
    console.log("[Record Count] Parties:", parties.length);
    if (!parties.length) return res.status(200).json(new ApiResponce(200, [], "No parties found"));

    const partyIds = parties.map(p => p._id);

    // Performance Optimization: Use Aggregation to calculate all party stats in ONE go
    const stats = await Item.aggregate([
        { $match: { partyId: { $in: partyIds } } },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order"
            }
        },
        { $unwind: "$order" },
        {
            $project: {
                partyId: 1,
                outgoingDate: 1,
                quantityArrived: 1,
                quantityRejected: { $ifNull: ["$quantityRejected", 0] },
                price: "$order.price",
                size_length: 1,
                size_width: 1,
                cost: {
                    $multiply: [
                        "$order.price",
                        "$size_length",
                        "$size_width",
                        { $subtract: ["$quantityArrived", { $ifNull: ["$quantityRejected", 0] }] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: "$partyId",
                previousBilling: {
                    $sum: {
                        $cond: [{ $lt: ["$outgoingDate", startDate] }, "$cost", 0]
                    }
                },
                currentBilling: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ["$outgoingDate", startDate] }, { $lt: ["$outgoingDate", endDate] }] },
                            "$cost",
                            0
                        ]
                    }
                },
                totalProcessed: { $sum: 1 }
            }
        }
    ]);

    const statsMap = new Map(stats.map(s => [s._id.toString(), s]));
    let grandTotalItemsProcessed = stats.reduce((sum, s) => sum + s.totalProcessed, 0);

    const reports = parties.map(party => {
        const pId = party._id.toString();
        const stat = statsMap.get(pId) || { previousBilling: 0, currentBilling: 0 };

        const previousPayments = (party.paymentsHistory || [])
            .filter(p => new Date(p.date) < startDate)
            .reduce((sum, p) => sum + p.amount, 0);

        const currentPayments = (party.paymentsHistory || [])
            .filter(p => new Date(p.date) >= startDate && new Date(p.date) < endDate)
            .reduce((sum, p) => sum + p.amount, 0);

        const openingBalance = Number((stat.previousBilling - previousPayments).toFixed(2));
        const currentBilling = Number(stat.currentBilling.toFixed(2));
        const closingBalance = Number((openingBalance + currentBilling - currentPayments).toFixed(2));

        return {
            partyName: party.partyName,
            openingBalance: openingBalance !== 0 ? openingBalance : 0,
            currentBilling,
            currentPayments: Number(currentPayments.toFixed(2)),
            closingBalance
        };
    }).filter(r => r.currentBilling > 0 || r.currentPayments > 0 || r.openingBalance !== 0);

    console.log("[Processed Records]", grandTotalItemsProcessed);

    const responseData = new ApiResponce(200, reports, "All Parties Report generated successfully");

    const serializationStart = performance.now();
    JSON.stringify(responseData);
    const serializationEnd = performance.now();
    console.log(`[JSON Serialization] ${(serializationEnd - serializationStart).toFixed(3)} ms`);

    return res.status(200).json(responseData)
})

const updatePartyPayment = asyncHandler(async (req, res) => {
    const { partyName } = req.params;
    const party = await getParty(partyName, req.user._id);
    const { paymentReceived, date, note } = req.body;
    if (paymentReceived === undefined || paymentReceived === null) throw new ApiError(400, "paymentReceived value is required")
    const amount = Number(paymentReceived);
    if (isNaN(amount) || amount < 0) throw new ApiError(400, "paymentReceived must be a non-negative number")

    // Add to history
    party.paymentsHistory.push({
        amount,
        date: date ? new Date(date) : new Date(),
        note: note || ""
    });

    // Update total for backward compatibility
    party.paymentReceived = (party.paymentReceived || 0) + amount;

    await party.save();
    return res.status(200).json(new ApiResponce(200, party, "Party payment recorded successfully"))
})

const editPartyPayment = asyncHandler(async (req, res) => {
    const { partyName, paymentId } = req.params;
    const { amount, date, note } = req.body;
    const party = await getParty(partyName, req.user._id);

    const paymentIndex = party.paymentsHistory.findIndex(p => p._id.toString() === paymentId);
    if (paymentIndex === -1) throw new ApiError(404, "Payment record not found");

    const oldAmount = party.paymentsHistory[paymentIndex].amount;
    const newAmount = Number(amount);
    if (isNaN(newAmount) || newAmount < 0) throw new ApiError(400, "Valid non-negative amount is required");

    // Update the record
    party.paymentsHistory[paymentIndex].amount = newAmount;
    if (date) party.paymentsHistory[paymentIndex].date = new Date(date);
    if (note !== undefined) party.paymentsHistory[paymentIndex].note = note;

    // Update total summary
    party.paymentReceived = (party.paymentReceived || 0) - oldAmount + newAmount;

    await party.save();
    return res.status(200).json(new ApiResponce(200, party, "Payment record updated successfully"));
})

const deletePartyPayment = asyncHandler(async (req, res) => {
    const { partyName, paymentId } = req.params;
    const party = await getParty(partyName, req.user._id);

    const paymentIndex = party.paymentsHistory.findIndex(p => p._id.toString() === paymentId);
    if (paymentIndex === -1) throw new ApiError(404, "Payment record not found");

    const oldAmount = party.paymentsHistory[paymentIndex].amount;

    // Remove the record
    party.paymentsHistory.splice(paymentIndex, 1);

    // Update total summary
    party.paymentReceived = (party.paymentReceived || 0) - oldAmount;

    await party.save();
    return res.status(200).json(new ApiResponce(200, party, "Payment record deleted successfully"));
})

const getPartyPaymentSummary = asyncHandler(async (req, res) => {
    const { partyName } = req.params;
    const party = await getParty(partyName, req.user._id);

    // Performance Optimization: Use Aggregation to calculate total order value in ONE query (Avoid N*M lookups)
    const orderStats = await Order.aggregate([
        { $match: { partyId: party._id } },
        {
            $lookup: {
                from: "items",
                localField: "_id",
                foreignField: "orderId",
                as: "items"
            }
        },
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$_id",
                price: { $first: "$price" },
                itemsTotal: {
                    $sum: {
                        $multiply: [
                            "$price",
                            { $ifNull: ["$items.size_length", 0] },
                            { $ifNull: ["$items.size_width", 0] },
                            {
                                $subtract: [
                                    { $ifNull: ["$items.quantityArrived", 0] },
                                    { $ifNull: ["$items.quantityRejected", 0] }
                                ]
                            }
                        ]
                    }
                }
            }
        },
        {
            $group: {
                _id: null,
                totalValue: { $sum: "$itemsTotal" }
            }
        }
    ]);

    const totalOrderValue = orderStats.length > 0 ? Number(orderStats[0].totalValue.toFixed(2)) : 0;
    const paymentReceived = Number((party.paymentReceived || 0).toFixed(2));
    const outstanding = Number((totalOrderValue - paymentReceived).toFixed(2));

    const responseData = new ApiResponce(200, {
        totalOrderValue,
        paymentReceived,
        outstanding: outstanding > 0 ? outstanding : 0
    }, "Payment summary fetched successfully");

    const payload = JSON.stringify(responseData);
    console.log("[Payload Size]", (Buffer.byteLength(payload) / 1024).toFixed(2), "KB");

    return res.status(200).json(responseData)
})

export {
    getAllParties,
    createNewParty,
    updatePartyName,
    getRejectedItemsAll,
    calculateTotalPrice,
    generateReportSingleParty,
    generateReportAllParties,
    updatePartyPayment,
    getPartyPaymentSummary,
    editPartyPayment,
    deletePartyPayment
}
