// Global async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware (use in server.js)
const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err.message, "| Route:", req.method, req.originalUrl);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
};

module.exports = { asyncHandler, errorHandler };
