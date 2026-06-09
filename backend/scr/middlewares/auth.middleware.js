import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized access - No token provided")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "access_token_secret_fallback_key_123")

        // Performance Optimization: Build req.user from JWT payload — NO DB LOOKUP.
        // The JWT payload already contains { _id, email, username } (see generateAccessToken).
        // A DB call here adds 30-300 ms latency on EVERY authenticated request.
        // We only hit the DB if the token payload is missing critical fields (legacy tokens).
        if (decodedToken?._id && decodedToken?.email && decodedToken?.username) {
            req.user = {
                _id: decodedToken._id,
                email: decodedToken.email,
                username: decodedToken.username
            };
            return next();
        }

        // Fallback: token payload incomplete — fetch from DB (rare, backward-compat path)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(401, "Invalid Access Token - User not found")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})
