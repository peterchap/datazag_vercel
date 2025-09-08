const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://crm.datazag.com',
  'https://*.vercel.app'
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : defaultAllowedOrigins).map(s => s.trim()).filter(Boolean);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const originMatches = (origin, patterns) => {
  if (!origin) return true; // Allow requests with no origin (e.g., server-to-server)
  const o = origin.toLowerCase();
  
  // Always allow localhost on any port for development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) {
    return true;
  }

  return patterns.some(pat => {
    const p = pat.toLowerCase();
    if (p.includes('*')) {
      const re = new RegExp('^' + escapeRegex(p).replace(/\\\*/g, '.*') + '$');
      return re.test(o);
    }
    return o === p;
  });
};

const corsOptions = {
  origin: function(origin, callback) {
    if (!originMatches(origin, allowedOrigins)) {
      const msg = `CORS policy does not allow access from the specified Origin: ${origin}`;
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-token'],
  optionsSuccessStatus: 204,
};

module.exports = { corsOptions };
