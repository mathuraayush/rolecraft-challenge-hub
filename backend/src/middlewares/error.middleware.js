/**
 * Global Error Handling Middleware
 * Should be added as the LAST middleware in app.js
 * 
 * Catches all errors from controllers and sends consistent error responses
 */

import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an ApiError instance, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message);
  }

  // Log error (in production, use proper logging service)
  const errorLog = {
    timestamp: new Date().toISOString(),
    statusCode: error.statusCode,
    message: error.message,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  console.error("[ERROR]", JSON.stringify(errorLog, null, 2));

  // Send error response
  return res.status(error.statusCode).json({
    statusCode: error.statusCode,
    data: null,
    message: error.message,
    errors: error.errors || [],
    success: false,
  });
};

/**
 * Handle 404 Not Found (add before error handler)
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.path} not found`);
  next(error);
};
