import mongoose from "mongoose";


async function connectDB(){
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}`);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    }
    catch(error){
        console.log("MONGODB CONNECTION ERROR",error);
        process.exit(1);
    }
}

export default connectDB