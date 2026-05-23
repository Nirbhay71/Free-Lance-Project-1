import { Router } from "express"
import {
    getItemFromPartyName,
    addNewItem,
    itemCompleted,
    itemRejected,
    updatePaymentReceived,
    updatePhotoOfItem,
    updateColor,
    updateSizeLength,
    updateSizeWidth,
    deleteItem,
    updatePrice,
    getRejectedItems,
    getCompletedItems,
    getInitialItems,
    updateOutgoingDate
} from "../controllers/item.controllers.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Secure all routes in this router
router.use(verifyJWT)

router.route("/new/:partyName").post(upload.single("photo"), addNewItem)
router.route("/party/:partyName").get(getItemFromPartyName)
router.route("/completed/:itemId").patch(itemCompleted)
router.route("/rejected/:itemId").patch(itemRejected)
router.route("/payment/:itemId").patch(updatePaymentReceived)
router.route("/photo/:itemId").patch(upload.single("photo"), updatePhotoOfItem)
router.route("/color/:itemId").patch(updateColor)
router.route("/size-length/:itemId").patch(updateSizeLength)
router.route("/size-width/:itemId").patch(updateSizeWidth)
router.route("/price/:itemId").patch(updatePrice)
router.route("/outgoing-date/:itemId").patch(updateOutgoingDate)
router.route("/delete/:itemId").delete(deleteItem)
router.route("/rejected-list/:partyName").get(getRejectedItems)
router.route("/completed-list/:partyName").get(getCompletedItems)
router.route("/initial-list/:partyName").get(getInitialItems)

export default router
