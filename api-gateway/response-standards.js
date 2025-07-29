/**
 * Standardized API Response Format and Status Codes
 * 
 * This module provides consistent response formats and HTTP status codes
 * for reliable communication between customer portal and BigQuery service.
 */

/**
 * Standard HTTP Status Codes
 */
const StatusCodes = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * Standard response format for all API endpoints
 */
class ApiResponse {
  static success(data = null, message = 'Success', statusCode = StatusCodes.OK) {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  static error(message = 'An error occurred', statusCode = StatusCodes.INTERNAL_SERVER_ERROR, details = null) {
    return {
      success: false,
      statusCode,
      message,
      error: details,
      timestamp: new Date().toISOString()
    };
  }

  static created(data, message = 'Resource created successfully') {
    return this.success(data, message, StatusCodes.CREATED);
  }

  static notFound(resource = 'Resource') {
    return this.error(`${resource} not found`, StatusCodes.NOT_FOUND);
  }

  static conflict(message = 'Resource already exists') {
    return this.error(message, StatusCodes.CONFLICT);
  }

  static unauthorized(message = 'Authentication required') {
    return this.error(message, StatusCodes.UNAUTHORIZED);
  }

  static forbidden(message = 'Access denied') {
    return this.error(message, StatusCodes.FORBIDDEN);
  }

  static badRequest(message = 'Invalid request') {
    return this.error(message, StatusCodes.BAD_REQUEST);
  }

  static unprocessableEntity(message = 'Validation failed', validationErrors = null) {
    return this.error(message, StatusCodes.UNPROCESSABLE_ENTITY, validationErrors);
  }

  static tooManyRequests(message = 'Rate limit exceeded') {
    return this.error(message, StatusCodes.TOO_MANY_REQUESTS);
  }

  static serverError(message = 'Internal server error') {
    return this.error(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Response handler middleware
 */
function responseHandler(req, res, next) {
  // Add standard response methods to res object
  res.success = (data, message, statusCode) => {
    const response = ApiResponse.success(data, message, statusCode);
    return res.status(response.statusCode).json(response);
  };

  res.error = (message, statusCode, details) => {
    const response = ApiResponse.error(message, statusCode, details);
    return res.status(response.statusCode).json(response);
  };

  res.created = (data, message) => {
    const response = ApiResponse.created(data, message);
    return res.status(response.statusCode).json(response);
  };

  res.notFound = (resource) => {
    const response = ApiResponse.notFound(resource);
    return res.status(response.statusCode).json(response);
  };

  res.conflict = (message) => {
    const response = ApiResponse.conflict(message);
    return res.status(response.statusCode).json(response);
  };

  res.unauthorized = (message) => {
    const response = ApiResponse.unauthorized(message);
    return res.status(response.statusCode).json(response);
  };

  res.forbidden = (message) => {
    const response = ApiResponse.forbidden(message);
    return res.status(response.statusCode).json(response);
  };

  res.badRequest = (message) => {
    const response = ApiResponse.badRequest(message);
    return res.status(response.statusCode).json(response);
  };

  res.unprocessableEntity = (message, validationErrors) => {
    const response = ApiResponse.unprocessableEntity(message, validationErrors);
    return res.status(response.statusCode).json(response);
  };

  res.tooManyRequests = (message) => {
    const response = ApiResponse.tooManyRequests(message);
    return res.status(response.statusCode).json(response);
  };

  res.serverError = (message) => {
    const response = ApiResponse.serverError(message);
    return res.status(response.statusCode).json(response);
  };

  next();
}

/**
 * Common use cases for API responses
 */
const ResponseExamples = {
  // API Key operations
  apiKeyCreated: (apiKey) => ApiResponse.created(apiKey, 'API key created successfully'),
  apiKeyNotFound: () => ApiResponse.notFound('API key'),
  apiKeyAlreadyExists: () => ApiResponse.conflict('API key name already exists'),
  apiKeyDeleted: () => ApiResponse.success(null, 'API key deleted successfully'),

  // User operations
  userNotFound: () => ApiResponse.notFound('User'),
  userCreated: (user) => ApiResponse.created(user, 'User created successfully'),
  userAlreadyExists: () => ApiResponse.conflict('User with this email already exists'),

  // Credit operations
  creditsUpdated: (credits) => ApiResponse.success({ credits }, 'Credits updated successfully'),
  insufficientCredits: () => ApiResponse.unprocessableEntity('Insufficient credits'),

  // Authentication
  invalidCredentials: () => ApiResponse.unauthorized('Invalid email or password'),
  invalidToken: () => ApiResponse.unauthorized('Invalid or expired token'),
  accessDenied: () => ApiResponse.forbidden('Access denied'),

  // Validation
  missingRequiredFields: (fields) => ApiResponse.badRequest(`Missing required fields: ${fields.join(', ')}`),
  invalidRequestFormat: () => ApiResponse.badRequest('Invalid request format'),

  // Redis sync operations
  redisSyncSuccess: () => ApiResponse.success(null, 'Redis cache updated successfully'),
  redisSyncFailed: () => ApiResponse.serverError('Failed to sync with Redis cache'),

  // Rate limiting
  rateLimitExceeded: () => ApiResponse.tooManyRequests('Too many requests, please try again later')
};

module.exports = {
  StatusCodes,
  ApiResponse,
  responseHandler,
  ResponseExamples
};