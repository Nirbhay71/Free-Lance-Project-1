import mongoose from "mongoose"
import { DB_NAME } from "../constants.js";
import "../utils/dbPerformance.js";

const connectDB = async () => {
    try {
        let dbUrl = process.env.DB_URL;
        if (dbUrl && dbUrl.endsWith("/")) {
            dbUrl = dbUrl.slice(0, -1);
        }
        const connectionInstance = await mongoose.connect(`${dbUrl}/${DB_NAME}`, {
            // Performance Optimization: Connection Pool & Reliability Settings
            maxPoolSize: 20,    // Default is 5. Prevents connection queuing on concurrent requests.
            minPoolSize: 5,     // Keep 5 connections warm to avoid cold-start latency.
            socketTimeoutMS: 45000, // Drop stale sockets after 45s to prevent hanging requests.
            serverSelectionTimeoutMS: 5000,  // Fail fast (5s) if MongoDB Atlas is unreachable.
            heartbeatFrequencyMS: 10000, // Check connection health every 10s.
            retryWrites: true,  // Automatically retry write operations on transient errors.
            retryReads: true,  // Automatically retry read operations on transient errors.
        })
        console.log("Database connected sucessfully ...");
        console.log("Host : ", connectionInstance.connection.host);
    } catch (err) {
        console.log("Database connection error in ./src/db/index.js");
        console.log("Error is : ", err);
        process.exit(1);
    }
}

export { connectDB }