import { Router } from "express"
import { addOrder, getOrdersByParty, deleteOrder, updateOrder } from "../controllers/order.controllers.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

// upload.any() allows optional photos with field names photo_0, photo_1 ...
router.route("/new/:partyName").post(upload.any(), addOrder)
router.route("/party/:partyName").get(getOrdersByParty)
router.route("/:orderId").patch(updateOrder)
router.route("/:orderId").delete(deleteOrder)

export default router
