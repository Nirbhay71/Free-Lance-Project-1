import { Router } from "express"
import {
    getAllParties,
    createNewParty,
    updatePartyName,
    getRejectedItemsAll,
    calculateTotalPrice,
    generateReportSingleParty,
    generateReportAllParties
} from "../controllers/party.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Secure all routes in this router
router.use(verifyJWT)

router.route("/all").get(getAllParties)
router.route("/create").post(createNewParty)
router.route("/update-name").patch(updatePartyName)
router.route("/rejected-all").get(getRejectedItemsAll)
router.route("/total-price/:partyName").post(calculateTotalPrice)
router.route("/report/single/:partyName").post(generateReportSingleParty)
router.route("/report/all").post(generateReportAllParties)

export default router
