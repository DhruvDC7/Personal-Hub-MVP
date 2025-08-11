/**
 * Handles 500 errors consistently across the application
 * @param {Error} error - The error object
 * @param {string} context - Additional context about where the error occurred
 * @returns {Response} - Formatted error response
 */
export function handleServerError(error, context = '') {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const timestamp = new Date().toISOString();
  const errorDetails = {
    error: 'Internal Server Error',
    message: error.message,
    errorId,
    timestamp,
    ...(context && { context })
  };

  // Log the error with all details
  console.error(`[${timestamp}] Error ID: ${errorId}`, {
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });

  return new Response(
    JSON.stringify(errorDetails),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handles API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Additional context about where the error occurred
 * @returns {Response} - Formatted error response
 */
export function handleApiError(error, context = '') {
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return new Response(
      JSON.stringify({
        error: 'Validation Error',
        message: error.message,
        details: error.details
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error.status === 401) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: error.message || 'Authentication required'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error.status === 404) {
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: error.message || 'The requested resource was not found'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Default to 500 for unhandled errors
  return handleServerError(error, context);
}
