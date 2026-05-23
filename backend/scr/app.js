import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Routes import
import userRouter from "./routes/user.routes.js"
import itemRouter from "./routes/item.routes.js"
import partyRouter from "./routes/party.routes.js"

// Routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/items", itemRouter)
app.use("/api/v1/parties", partyRouter)

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error(`[API Error] Status: ${statusCode} | Message: ${message}`);
    if (err.stack && statusCode === 500) {
        console.error(err.stack);
    }

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || []
    });
});

export { app }