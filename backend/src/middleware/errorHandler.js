export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  };

  // SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE constraint failed')) {
      error.message = 'Duplicate entry found';
      error.status = 409;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = err.details?.[0]?.message || 'Validation error';
    error.status = 400;
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
