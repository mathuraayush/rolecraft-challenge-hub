import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express();
app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);
// app.use(
//   cors({
//     origin: (requestOrigin, callback) => {
//       if (!requestOrigin) return callback(null, true);
//       if (!allowedOrigins || allowedOrigins.length === 0) return callback(null, true);

//       const normalizedRequestOrigin = requestOrigin.replace(/\/$/, "");
//       const hasOrigin = allowedOrigins.some((origin) => {
//         const normalized = origin.replace(/\/$/, "");
//         return normalized === normalizedRequestOrigin;
//       });

//       if (allowedOrigins.includes("*") || hasOrigin) {
//         return callback(null, true);
//       }

//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//   })
// );


app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'
import roleRouter from './routes/role.routes.js'
import projectRouter from './routes/project.routes.js'
import submissionRouter from './routes/submission.routes.js'
import portfolioRouter from './routes/portfolio.routes.js'
import recruiterRouter from './routes/recruiter.routes.js'
import uploadRouter from './routes/upload.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/roles", roleRouter)
app.use("/api/v1/projects", projectRouter)
app.use("/api/v1/submissions", submissionRouter)
app.use("/api/v1/portfolios", portfolioRouter)
app.use("/api/v1/recruiters", recruiterRouter)
app.use("/api/v1/upload", uploadRouter)

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

export {app}