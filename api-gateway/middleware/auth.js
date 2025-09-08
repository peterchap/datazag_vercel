const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies the token from a logged-in user. It now checks the Authorization
 * header first, and then falls back to checking common cookie names.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // If the token is not in the header, fall back to checking cookies.
  if (!token) {
    const cookieHeader = req.headers['cookie'] || '';
    const getCookie = (name) => {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')}=([^;]*)`));
      // This is the fix: The cookie value is in the first capture group (match[1]).
      return match ? decodeURIComponent(match[1]) : null;
    };
    // This now correctly looks for the next-auth v5 cookie name first.
    token = getCookie('authjs.session-token') || getCookie('token') || getCookie('auth_token');
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
    if (err) {
      // Add more detailed logging for token verification errors
      console.error('[Auth Middleware] JWT Verification Error:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    console.log('[Auth Middleware] Decoded JWT Payload:', decodedPayload);
    
    req.user = {
      id: decodedPayload.sub, 
      role: decodedPayload.role,
    };

    next();
  });
};

/**
 * Service-to-Service Authentication Middleware
 * Verifies a static token from another one of your backend services.
 */
const authenticateServiceKey = (req, res, next) => {
  const internalToken = req.headers['x-internal-token'];
  
  if (!internalToken || internalToken !== process.env.INTERNAL_API_TOKEN) {
    return res.status(403).json({ message: 'Invalid or missing service token.' });
  }
  
  next();
};

/**
 * Role-based Authorization Middleware
 * Checks if the authenticated user has one of the required roles.
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = { authenticateToken, authenticateServiceKey, authorize };

