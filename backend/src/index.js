import dotenv from "dotenv";
dotenv.config();


// import 'dotenv/config'
import connectDB from "./db/index.js";
import { app } from './app.js';


connectDB()
.then( () =>{
    app.listen(process.env.PORT || 8080, ()=>{
        console.log(`Server is running at port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO DB Connection Failed!!!", err);
})
 
// function connectDB(){

// }

// connectDB();
//IFE
// (async () => {
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch (error) {
//         console.error("ERROR: ", error)
//         throw error
//     }
// })()