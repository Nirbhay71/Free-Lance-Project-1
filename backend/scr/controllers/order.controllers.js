import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Party } from "../models/party.models.js"
import { Order } from "../models/order.models.js"
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
        if (error instanceof ApiError) throw error;
        throw new ApiError(410, 'Something went wrong')
    }
}

// Add an order with multiple items in one request
// Body (multipart/form-data):
//   orderName, price
//   items[0][itemName], items[0][color], items[0][size_length], items[0][size_width], items[0][quantityArrived]
//   photo_0, photo_1 ... (optional per-item photos matched by index)
const addOrder = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    const { orderName, price } = req.body;

    if (!orderName || !price) {
        throw new ApiError(400, 'Order name and price are required')
    }

    // items is sent as JSON string or as indexed fields items[0][color] etc.
    let itemsData = [];
    if (req.body.items) {
        // If sent as a JSON string
        try {
            itemsData = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
        } catch {
            throw new ApiError(400, 'Invalid items data format')
        }
    } else {
        // Parse indexed fields: items[0][color], items[1][color] ...
        const indexedItems = {};
        Object.keys(req.body).forEach(key => {
            const match = key.match(/^items\[(\d+)\]\[(\w+)\]$/);
            if (match) {
                const idx = Number(match[1]);
                const field = match[2];
                if (!indexedItems[idx]) indexedItems[idx] = {};
                indexedItems[idx][field] = req.body[key];
            }
        });
        itemsData = Object.values(indexedItems);
    }

    if (!itemsData || itemsData.length === 0) {
        throw new ApiError(400, 'At least one item is required in an order')
    }

    // Validate each item
    const allowedColors = ["gold", "rose gold", "black"];
    for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const color = String(item.color || "").trim().toLowerCase();
        if (!allowedColors.includes(color)) {
            throw new ApiError(400, `Item ${i + 1}: Invalid color. Must be gold, rose gold, or black.`)
        }
        if (!item.size_length || !item.size_width || !item.quantityArrived) {
            throw new ApiError(400, `Item ${i + 1}: size_length, size_width, and quantityArrived are required`)
        }
    }

    // Create the Order
    const order = await Order.create({
        orderName: orderName.trim(),
        price: Number(price),
        partyId: party._id
    })

    if (!order) {
        throw new ApiError(500, 'Unable to create order')
    }

    // Create each Item
    const createdItems = [];
    for (let i = 0; i < itemsData.length; i++) {
        const itemDat = itemsData[i];
        const color = String(itemDat.color).trim().toLowerCase();

        // Handle optional per-item photo
        let photoUrl = "";
        const photoFile = req.files?.[`photo_${i}`]?.[0];
        if (photoFile) {
            const uploaded = await uploadFileOnCloudinary(photoFile.path);
            if (uploaded) {
                photoUrl = uploaded.url;
            }
        }

        const item = await Item.create({
            itemName: (itemDat.itemName || "").trim(),
            color,
            size_length: Number(itemDat.size_length),
            size_width: Number(itemDat.size_width),
            quantityArrived: Number(itemDat.quantityArrived),
            photo: photoUrl,
            orderId: order._id,
            partyId: party._id
        })
        createdItems.push(item);
    }

    return res.status(200).json(
        new ApiResponce(200, { order, items: createdItems }, "Order created successfully")
    )
})

// Get all orders for a party, with their items populated
const getOrdersByParty = asyncHandler(async (req, res) => {
    const { partyName } = req.params;

    if (!partyName) {
        throw new ApiError(400, 'No Party Name Provided')
    }

    const party = await getParty(partyName, req.user._id);

    const orders = await Order.find({ partyId: party._id }).sort({ createdAt: -1 });
    console.log("[Record Count] Orders:", orders.length);

    if (orders.length === 0) {
        return res.status(200).json(new ApiResponce(200, { orders: [], party }, "Orders fetched successfully"));
    }

    // Performance Optimization: Batch fetch all items for all retrieved orders (Avoid N+1)
    const orderIds = orders.map(o => o._id);
    const allItems = await Item.find({ orderId: { $in: orderIds } });
    console.log("[Record Count] Items:", allItems.length);

    // Group items by orderId for O(1) lookup
    const itemsByOrder = new Map();
    allItems.forEach(item => {
        const oid = item.orderId.toString();
        if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
        itemsByOrder.get(oid).push(item);
    });

    const ordersWithItems = orders.map(order => {
        const items = itemsByOrder.get(order._id.toString()) || [];
        // Calculate totalPrice = rate × Σ(L×W×qty)
        const totalPrice = items.reduce((sum, item) => {
            const area = (item.size_length || 0) * (item.size_width || 0);
            return sum + (order.price || 0) * area * (item.quantityArrived || 0);
        }, 0);

        return {
            ...order.toObject(),
            items,
            totalPrice: Number(totalPrice.toFixed(2)) // Enforce precision
        };
    });

    console.log("[Processed Records]", orders.length + allItems.length);

    const responseData = new ApiResponce(200, { orders: ordersWithItems, party }, "Orders fetched successfully");

    const serializationStart = performance.now();
    const payload = JSON.stringify(responseData);
    const serializationEnd = performance.now();
    console.log(`[JSON Serialization] ${(serializationEnd - serializationStart).toFixed(3)} ms`);
    console.log("[Payload Size]", (Buffer.byteLength(payload) / 1024).toFixed(2), "KB");

    return res.status(200).json(responseData)
})

// Delete an order and all its items
const deleteOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        throw new ApiError(400, 'No Order ID Provided')
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, 'Order not found')
    }

    // Verify the order belongs to the requesting user's party
    const party = await Party.findOne({ _id: order.partyId, createdBy: req.user._id });
    if (!party) {
        throw new ApiError(403, 'Not authorized to delete this order')
    }

    // Delete all items in the order (and their Cloudinary photos)
    const items = await Item.find({ orderId: order._id });
    for (const item of items) {
        if (item.photo) {
            deleteFileFromCloudinary(item.photo);
        }
    }
    await Item.deleteMany({ orderId: order._id });
    await Order.findByIdAndDelete(orderId);

    return res.status(200).json(
        new ApiResponce(200, {}, "Order and all its items deleted successfully")
    )
})

// Update order name or price
const updateOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        throw new ApiError(400, 'No Order ID Provided')
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, 'Order not found')
    }

    const party = await Party.findOne({ _id: order.partyId, createdBy: req.user._id });
    if (!party) {
        throw new ApiError(403, 'Not authorized to update this order')
    }

    const { orderName, price } = req.body;
    if (orderName) order.orderName = orderName.trim();
    if (price !== undefined) order.price = Number(price);
    await order.save();

    return res.status(200).json(
        new ApiResponce(200, order, "Order updated successfully")
    )
})

export { addOrder, getOrdersByParty, deleteOrder, updateOrder }
