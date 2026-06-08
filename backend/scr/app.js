import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

const allowedOrigins = [
    "http://localhost:5173",
    "https://free-lance-project-1-gamma.vercel.app"
];
if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(",").forEach(o => {
        const trimmed = o.trim();
        if (!allowedOrigins.includes(trimmed)) {
            allowedOrigins.push(trimmed);
        }
    });
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
        const isVercel = origin.endsWith(".vercel.app");
        const isAllowed = allowedOrigins.includes(origin);

        if (isLocalhost || isVercel || isAllowed) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
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
import orderRouter from "./routes/order.routes.js"

// Routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/items", itemRouter)
app.use("/api/v1/parties", partyRouter)
app.use("/api/v1/orders", orderRouter)

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