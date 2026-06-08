import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Party } from "../models/party.models.js"
import { Item } from "../models/items.models.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { uploadFileOnCloudinary, deleteFileFromCloudinary } from "../utils/cloudinary.js"

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

const addNewItem = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, 'No such Party Name exists')
    }

    // Normalize body keys to strip accidental trailing spaces
    const cleanBody = {};
    Object.keys(req.body).forEach(key => {
        cleanBody[key.trim()] = req.body[key];
    });

    const { color, size_length, size_width, quantityArrived, itemName, orderId } = cleanBody;

    console.log("Processed req.body:", cleanBody);

    if (!color || !size_length || !size_width || !quantityArrived) {
        throw new ApiError(400, 'color, size_length, size_width, and quantityArrived are required')
    }

    const normalizedColor = String(color).trim().toLowerCase();
    const allowedColors = ["gold", "rose gold", "black"];
    if (!allowedColors.includes(normalizedColor)) {
        throw new ApiError(400, "Invalid color option. Must be gold, rose gold, or black.");
    }

    // Photo is optional
    let photoUrl = "";
    const photoLocalPath = req.file?.path;
    if (photoLocalPath) {
        const photo = await uploadFileOnCloudinary(photoLocalPath)
        if (photo) {
            photoUrl = photo.url;
        }
    }

    const item = await Item.create({
        itemName: (itemName || "").trim(),
        color: normalizedColor,
        quantityArrived: Number(quantityArrived),
        size_length: Number(size_length),
        size_width: Number(size_width),
        partyId: party?._id,
        photo: photoUrl,
        ...(orderId ? { orderId } : {})
    })

    if (!item) {
        throw new ApiError(400, "Unable to create the Item")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "New Item Created Successfully"
            )
        )

})

// Need to check it gives all items or not
const getItemFromPartyName = asyncHandler(async (req, res) => {
    const { partyName } = req.params
    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id)

    const items = await Item.find({ partyId: party?._id })

    if (!items?.length) {
        throw new ApiError(404, 'No Items on given Party Name  Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                items,
                "Items fetched successfully from given Party Name"
            )
        )

})

const itemCompleted = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    let quantityCompleted = req.body.quantityCompleted;
    if (quantityCompleted === undefined) {
        quantityCompleted = typeof req.body === 'object' ? req.body.quantityCompleted : req.body;
    }
    quantityCompleted = Number(quantityCompleted);

    if (isNaN(quantityCompleted) || quantityCompleted < 0) {
        throw new ApiError(400, "Completed quantity must be a non-negative number")
    }

    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(404, "Item not found")
    }

    const isAbsolute = req.body?.isAbsolute === true;
    if (isAbsolute) {
        if (quantityCompleted + (item.quantityRejected || 0) > item.quantityArrived) {
            throw new ApiError(400, `Completed + Rejected quantity cannot exceed arrived quantity (${item.quantityArrived})`);
        }
        item.quantityCompleted = quantityCompleted;
    } else {
        const totalNewQty = (item.quantityCompleted || 0) + (item.quantityRejected || 0) + quantityCompleted;
        if (totalNewQty > item.quantityArrived) {
            throw new ApiError(400, `Total completed + rejected quantity (${totalNewQty}) cannot exceed arrived quantity (${item.quantityArrived})`)
        }
        item.quantityCompleted = (item.quantityCompleted || 0) + quantityCompleted;
    }
    await item.save();

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Completed quantity of Item Updated Successfully"
            )
        )
})

const itemRejected = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    let quantityRejected = req.body.quantityRejected;
    if (quantityRejected === undefined) {
        quantityRejected = typeof req.body === 'object' ? req.body.quantityRejected : req.body;
    }
    quantityRejected = Number(quantityRejected);

    if (isNaN(quantityRejected) || quantityRejected < 0) {
        throw new ApiError(400, "Rejected quantity must be a non-negative number")
    }

    const item = await Item.findById(itemId);

    if (!item) {
        throw new ApiError(404, "Item not found")
    }

    const isAbsolute = req.body?.isAbsolute === true;
    if (isAbsolute) {
        if (quantityRejected + (item.quantityCompleted || 0) > item.quantityArrived) {
            throw new ApiError(400, `Completed + Rejected quantity cannot exceed arrived quantity (${item.quantityArrived})`);
        }
        item.quantityRejected = quantityRejected;
    } else {
        const totalNewQty = (item.quantityCompleted || 0) + (item.quantityRejected || 0) + quantityRejected;
        if (totalNewQty > item.quantityArrived) {
            throw new ApiError(400, `Total completed + rejected quantity (${totalNewQty}) cannot exceed arrived quantity (${item.quantityArrived})`)
        }
        item.quantityRejected = (item.quantityRejected || 0) + quantityRejected;
    }
    await item.save();

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Rejected quantity of Item Updated Successfully"
            )
        )
})


const updatePhotoOfItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const item = await Item.findById(itemId);
    if (!item) {
        throw new ApiError(404, "No such Item exists");
    }

    const photoLocalPath = req.file?.path;

    if (!photoLocalPath) {
        throw new ApiError(400, "Photo not provided")
    }

    const photo = await uploadFileOnCloudinary(photoLocalPath)

    if (!photo) {
        throw new ApiError(400, "Unable to upload the provided Photo")
    }

    const oldPhotoUrl = item.photo;

    item.photo = photo.url;
    await item.save();

    if (oldPhotoUrl) {
        deleteFileFromCloudinary(oldPhotoUrl);
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Photo of Item Updated Successfully"
            )
        )

})

const updateColor = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const color = req.body?.color;

    if (!color) {
        throw new ApiError(400, "No Color Provided")
    }

    const normalizedColor = String(color).trim().toLowerCase();
    const allowedColors = ["gold", "rose gold", "black"];
    if (!allowedColors.includes(normalizedColor)) {
        throw new ApiError(400, "Invalid color option. Must be gold, rose gold, or black.");
    }

    const item = await Item.findByIdAndUpdate(
        itemId,
        {
            $set: { color: normalizedColor }
        },
        { new: true, runValidators: true }
    )

    if (!item) {
        throw new ApiError(404, "Not able to update the color of item")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Color of Item Updated Successfully"
            )
        )
})

const updateSizeLength = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const sizeLength = req.body?.size_length;

    if (!sizeLength) {
        throw new ApiError(400, "Size Length not provided")
    }

    const item = await Item.findByIdAndUpdate(
        itemId,
        { size_length: sizeLength },
        { new: true }
    )

    if (!item) {
        throw new ApiError(404, "Not able to update the size length of item")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Size Length of Item Updated Successfully"
            )
        )
})

const updateSizeWidth = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const sizeWidth = req.body?.size_width;

    if (!sizeWidth) {
        throw new ApiError(400, "Size Width not provided")
    }

    const item = await Item.findByIdAndUpdate(
        itemId,
        { size_width: sizeWidth },
        { new: true }
    )

    if (!item) {
        throw new ApiError(404, "Not able to update the size width of item")
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Size width of Item Updated Successfully"
            )
        )
})

const deleteItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const item = await Item.findByIdAndDelete(itemId)

    if (!item) {
        throw new ApiError(404, "Not able to delete the item")
    }

    if (item.photo) {
        deleteFileFromCloudinary(item.photo);
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Successfully deleted the item"
            )
        )

}
)


const updateOutgoingDate = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const { outgoingDate } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
        throw new ApiError(404, "Item not found");
    }

    item.outgoingDate = outgoingDate ? new Date(outgoingDate) : undefined;
    await item.save();

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                item,
                "Outgoing date of Item Updated Successfully"
            )
        )
})

const getRejectedItems = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, 'No such Party Name exists under your account')
    }

    const items = await Item.aggregate(
        [
            {
                $match: {
                    partyId: party?._id
                }
            },
            {
                $match: {
                    quantityRejected: { $gt: 0 }
                }
            }
        ]
    )

    if (!items?.length) {
        throw new ApiError(404, 'No Items on given Party Name Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                items,
                'Successfully fetched all rejected items from given Party Name'
            )
        )

})

const getCompletedItems = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, 'No such Party Name exists under your account')
    }

    const items = await Item.aggregate(
        [
            {
                $match: {
                    partyId: party?._id
                }
            },
            {
                $match: {
                    quantityCompleted: { $gt: 0 }
                }
            }
        ]
    )

    if (!items?.length) {
        throw new ApiError(404, 'No Items on given Party Name Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                items,
                'Successfully fetched all completed items from given Party Name'
            )
        )

})

const getInitialItems = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    if (!party) {
        throw new ApiError(404, 'No such Party Name exists under your account')
    }

    const items = await Item.aggregate(
        [
            {
                $match: {
                    partyId: party?._id
                }
            },
            {
                $match: {
                    $expr: {
                        $ne: [
                            "$quantityArrived",
                            { $add: ["$quantityCompleted", "$quantityRejected"] }
                        ]
                    }
                }
            }
        ]
    )

    if (!items?.length) {
        throw new ApiError(404, 'No Items on given Party Name Found')
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                items,
                'Successfully fetched all initial items from given Party Name'
            )
        )

})
const updateQuantityArrived = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const quantityArrived = Number(req.body.quantityArrived);

    if (isNaN(quantityArrived) || quantityArrived < 0) {
        throw new ApiError(400, 'Quantity arrived must be a non-negative number')
    }

    const item = await Item.findById(itemId);
    if (!item) {
        throw new ApiError(404, 'Item not found')
    }

    // Ensure completed + rejected don't exceed new arrived value
    if ((item.quantityCompleted || 0) + (item.quantityRejected || 0) > quantityArrived) {
        throw new ApiError(400, `Cannot set quantityArrived below already processed quantity (${(item.quantityCompleted || 0) + (item.quantityRejected || 0)})`)
    }

    item.quantityArrived = quantityArrived;
    await item.save();

    return res.status(200).json(
        new ApiResponce(200, item, 'Quantity Arrived updated successfully')
    )
})

const updateItemName = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { itemName } = req.body;

    if (!itemId) {
        throw new ApiError(400, 'No Item ID Provided')
    }

    const item = await Item.findById(itemId);
    if (!item) {
        throw new ApiError(404, 'Item not found')
    }

    item.itemName = (itemName || "").trim();
    await item.save();

    return res.status(200).json(
        new ApiResponce(200, item, 'Item Name updated successfully')
    )
})



export {
    getItemFromPartyName,
    addNewItem,
    itemCompleted,
    itemRejected,
    updatePhotoOfItem,
    updateColor,
    updateSizeLength,
    updateSizeWidth,
    deleteItem,
    getRejectedItems,
    getCompletedItems,
    getInitialItems,
    updateOutgoingDate,
    updateQuantityArrived,
    updateItemName
}
