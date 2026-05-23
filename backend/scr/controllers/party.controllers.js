import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { Party } from "../models/party.models.js"
import { Item } from "../models/items.models.js"

const getParty = async (name, createdBy) => {
    try {
        const party = await Party.findOne({ partyName: name, createdBy })

        if (!party) {
            throw new ApiError(404, 'No such Party Name exists')
        }

        return party;
    } catch (error) {
        throw new ApiError(410, 'Something went wrong')
    }
}

// Need to check this is correct or not
// Description: Get all the partys from the database
const getAllParties = asyncHandler(async (req, res) => {

    const parties = await Party.find({ createdBy: req.user._id })

    if (!parties) {
        throw new ApiError(404, "No parties found")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                parties,
                "Successfully fetched all parties"
            )
        )
})

const createNewParty = asyncHandler(async (req, res) => {
    const { partyName } = req.body;

    if (!partyName) {
        throw new ApiError(400, "Party name is required")
    }

    const party = await Party.findOne({ partyName: partyName, createdBy: req.user._id })

    if (party) {
        throw new ApiError(409, "Party already exists under your account")
    }

    const newParty = await Party.create({ partyName: partyName, createdBy: req.user._id })

    if (!newParty) {
        throw new ApiError(400, "Unable to create a new party")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                newParty,
                "New party created successfully"
            )
        )
})

const updatePartyName = asyncHandler(async (req, res) => {
    const { oldname, newName } = req.body;

    if (!oldname || !newName) {
        throw new ApiError(400, "Old name and new name are required")
    }

    const party = await getParty(oldname, req.user._id)

    if (!party) { throw new ApiError(404, "No such party exists under your account") }

    party.partyName = newName;
    await party.save();

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                party,
                "Old name updated successfully to new name"
            )
        )

})

// Probably aggregate pipeline is required
// Need to check it gives all items or not
const getRejectedItemsAll = asyncHandler(async (req, res) => {
    const items = await Item.aggregate([
        {
            $match: {
                quantityRejected: { $gt: 0 }
            }
        },
        {
            $lookup: {
                from: "parties",
                localField: "partyId",
                foreignField: "_id",
                as: "partyDetails"
            }
        },
        {
            $unwind: "$partyDetails"
        },
        {
            $match: {
                "partyDetails.createdBy": req.user._id
            }
        },
        {
            $group: {
                _id: "$partyDetails._id",
                partyName: { $first: "$partyDetails.partyName" },
                rejectedItemsCount: { $sum: 1 },
                totalQuantityRejected: { $sum: "$quantityRejected" }
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                items,
                "Successfully fetched all parties with rejected items"
            )
        )
})

const calculateTotalPrice = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, "Party name is required")
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, "No such party exists under your account")
    }

    const { month, year } = req.body;

    if (!month || !year) {
        throw new ApiError(400, "Month and year are required")
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const items = await Item.aggregate([
        {
            $match: {
                partyId: party._id,
                quantityCompleted: { $gt: 0 },
                outgoingDate: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        }
    ])

    if (!items?.length) {
        throw new ApiError(404, "No completed items found for this period")
    }

    let totalPrice = 0;

    items.forEach(item => {
        totalPrice += item.price * (item.size_length * item.size_width) * item.quantityCompleted;
    });

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                totalPrice,
                "Total Price calculated successfully",
            )
        )
})

const generateReportSingleParty = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, "Party name is required")
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, "No such party exists under your account") 
    }

    const { month, year } = req.body;

    if (!month || !year) {
        throw new ApiError(400, "Month and year are required")
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const items = await Item.aggregate([
        {
            $match: {
                partyId: party._id,
                outgoingDate: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        }
    ]);

    if (!items?.length) {
        throw new ApiError(404, "No items found for this party in the specified period")
    }

    let totalCost = 0;
    let totalPaymentReceived = 0;
    let totalRejectedCost = 0;
    let totalQuantityArrived = 0;
    let totalQuantityCompleted = 0;
    let totalQuantityRejected = 0;
    let totalQuantityPending = 0;

    const itemsWithPendingPayments = [];
    const itemDetails = [];

    items.forEach(item => {
        const itemCost = item.price * (item.size_length * item.size_width) * (item.quantityArrived - item.quantityRejected);
        const rejectedCost = item.price * (item.size_length * item.size_width) * (item.quantityRejected || 0);
        const pendingPayment = itemCost - (item.paymentReceived || 0);

        totalCost += itemCost;
        totalPaymentReceived += (item.paymentReceived || 0);
        totalRejectedCost += rejectedCost;
        totalQuantityArrived += (item.quantityArrived || 0);
        totalQuantityCompleted += (item.quantityCompleted || 0);
        totalQuantityRejected += (item.quantityRejected || 0);

        const pendingQty = Math.max(0, (item.quantityArrived || 0) - (item.quantityCompleted || 0) - (item.quantityRejected || 0));
        totalQuantityPending += pendingQty;

        const detail = {
            _id: item._id,
            color: item.color,
            size_length: item.size_length,
            size_width: item.size_width,
            price: item.price,
            quantityArrived: item.quantityArrived,
            quantityCompleted: item.quantityCompleted,
            quantityRejected: item.quantityRejected,
            quantityPending: pendingQty,
            paymentReceived: item.paymentReceived || 0,
            itemCost,
            rejectedCost,
            pendingPayment: pendingPayment > 0 ? pendingPayment : 0,
            photo: item.photo,
            outgoingDate: item.outgoingDate
        };

        itemDetails.push(detail);

        if (pendingPayment > 0) {
            itemsWithPendingPayments.push(detail);
        }
    });

    const totalPaymentPending = totalCost - totalPaymentReceived;

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                {
                    partyName: party.partyName,
                    totalCost,
                    totalPaymentReceived,
                    totalPaymentPending: totalPaymentPending > 0 ? totalPaymentPending : 0,
                    totalRejectedCost,
                    totalQuantityArrived,
                    totalQuantityCompleted,
                    totalQuantityRejected,
                    totalQuantityPending,
                    hasPendingWork: totalQuantityPending > 0,
                    hasRejections: totalQuantityRejected > 0,
                    items: itemDetails,
                    itemsWithPendingPayments
                },
                "Single Party Report generated successfully"
            )
        )
})

const generateReportAllParties = asyncHandler(async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        throw new ApiError(400, "Month and year are required")
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const items = await Item.aggregate([
        {
            $match: {
                outgoingDate: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        },
        {
            $lookup: {
                from: "parties",
                localField: "partyId",
                foreignField: "_id",
                as: "partyDetails"
            }
        },
        {
            $unwind: "$partyDetails"
        },
        {
            $match: {
                "partyDetails.createdBy": req.user._id
            }
        }
    ]);

    if (!items?.length) {
        throw new ApiError(404, "No items found for the specified period")
    }

    const partyGroups = {};

    let grandTotalCost = 0;
    let grandTotalPaymentReceived = 0;
    let grandTotalRejectedCost = 0;
    let grandTotalQuantityArrived = 0;
    let grandTotalQuantityCompleted = 0;
    let grandTotalQuantityRejected = 0;
    let grandTotalQuantityPending = 0;

    const partiesWithPendingWork = new Set();
    const partiesWithRejections = new Set();
    const itemsWithPendingPayments = [];

    items.forEach(item => {
        const partyName = item.partyDetails.partyName;
        const partyId = item.partyDetails._id;

        if (!partyGroups[partyId]) {
            partyGroups[partyId] = {
                partyName,
                totalCost: 0,
                paymentReceived: 0,
                totalQuantityArrived: 0,
                totalQuantityCompleted: 0,
                totalQuantityRejected: 0,
                totalQuantityPending: 0,
                totalRejectedCost: 0,
                hasPendingWork: false,
                hasRejections: false
            };
        }

        const itemCost = item.price * (item.size_length * item.size_width) * (item.quantityArrived - item.quantityRejected);
        const rejectedCost = item.price * (item.size_length * item.size_width) * (item.quantityRejected || 0);
        const pendingPayment = itemCost - (item.paymentReceived || 0);

        partyGroups[partyId].totalCost += itemCost;
        partyGroups[partyId].paymentReceived += (item.paymentReceived || 0);
        partyGroups[partyId].totalQuantityArrived += (item.quantityArrived || 0);
        partyGroups[partyId].totalQuantityCompleted += (item.quantityCompleted || 0);
        partyGroups[partyId].totalQuantityRejected += (item.quantityRejected || 0);
        partyGroups[partyId].totalRejectedCost += rejectedCost;

        const pendingQty = Math.max(0, (item.quantityArrived || 0) - (item.quantityCompleted || 0) - (item.quantityRejected || 0));
        partyGroups[partyId].totalQuantityPending += pendingQty;

        if (pendingQty > 0) {
            partyGroups[partyId].hasPendingWork = true;
            partiesWithPendingWork.add(partyName);
        }

        if ((item.quantityRejected || 0) > 0) {
            partyGroups[partyId].hasRejections = true;
            partiesWithRejections.add(partyName);
        }

        if (pendingPayment > 0) {
            itemsWithPendingPayments.push({
                partyName,
                itemId: item._id,
                color: item.color,
                size_length: item.size_length,
                size_width: item.size_width,
                totalCost: itemCost,
                paymentReceived: item.paymentReceived || 0,
                pendingPayment
            });
        }

        grandTotalCost += itemCost;
        grandTotalPaymentReceived += (item.paymentReceived || 0);
        grandTotalRejectedCost += rejectedCost;
        grandTotalQuantityArrived += (item.quantityArrived || 0);
        grandTotalQuantityCompleted += (item.quantityCompleted || 0);
        grandTotalQuantityRejected += (item.quantityRejected || 0);
        grandTotalQuantityPending += pendingQty;
    });

    const partyBreakdown = Object.values(partyGroups).map(group => {
        const paymentPending = group.totalCost - group.paymentReceived;
        let workStatus = "Completed";
        if (group.hasPendingWork) {
            workStatus = "Pending";
        } else if (group.totalQuantityRejected > 0 && group.totalQuantityCompleted === 0) {
            workStatus = "Rejected Only";
        }

        return {
            ...group,
            paymentPending: paymentPending > 0 ? paymentPending : 0,
            workStatus
        };
    });

    const grandTotalPaymentPending = grandTotalCost - grandTotalPaymentReceived;

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                {
                    month,
                    year,
                    grandTotalCost,
                    grandTotalPaymentReceived,
                    grandTotalPaymentPending: grandTotalPaymentPending > 0 ? grandTotalPaymentPending : 0,
                    grandTotalRejectedCost,
                    grandTotalQuantityArrived,
                    grandTotalQuantityCompleted,
                    grandTotalQuantityRejected,
                    grandTotalQuantityPending,
                    partiesWithPendingWork: Array.from(partiesWithPendingWork),
                    partiesWithRejections: Array.from(partiesWithRejections),
                    itemsWithPendingPayments,
                    parties: partyBreakdown
                },
                "All Parties Report generated successfully"
            )
        )
})

export {
    getAllParties,
    createNewParty,
    updatePartyName,
    getRejectedItemsAll,
    calculateTotalPrice,
    generateReportSingleParty,
    generateReportAllParties
}