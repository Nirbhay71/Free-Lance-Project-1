import "dotenv/config"
import { connectDB } from "./db/index.js";
import {app} from "./app.js"


const port = process.env.PORT || 5000

connectDB()
.then(()=>{
    app.on("error",(err)=>{
        console.log("Error before listing to the port");
        throw err
    })

    app.listen(port, ()=>{
        console.log(`Server is running on the port ${port} ...`);
    })
})
.catch((err)=>{
    console.log("Database connection failed error : ",err);
})