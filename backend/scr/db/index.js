import mongoose from "mongoose"
import { DB_NAME } from "../constants.js";
import "../utils/dbPerformance.js";

const connectDB = async () => {
    try {
        let dbUrl = process.env.DB_URL;
        if (dbUrl && dbUrl.endsWith("/")) {
            dbUrl = dbUrl.slice(0, -1);
        }
        const connectionInstance = await mongoose.connect(`${dbUrl}/${DB_NAME}`)
        console.log("Database connected sucessfully ...");
        console.log("Host : ", connectionInstance.connection.host);
    } catch (err) {
        console.log("Database connection error in ./src/db/index.js");
        console.log("Error is : ", err);
        process.exit(1);
    }
}

export { connectDB }