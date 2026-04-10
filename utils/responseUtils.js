/**
 * Success response wrapper
 */
function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Error response wrapper
 */
function errorResponse(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Pagination helper
 */
function getPagination(page, limit) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skip = (pageInt - 1) * limitInt;

  return {
    page: pageInt,
    limit: limitInt,
    skip,
  };
}

/**
 * Create pagination response
 */
function createPaginationResponse(total, page, limit) {
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
    hasNext: parseInt(page) * parseInt(limit) < total,
    hasPrevious: parseInt(page) > 1,
  };
}

module.exports = {
  successResponse,
  errorResponse,
  getPagination,
  createPaginationResponse,
};
