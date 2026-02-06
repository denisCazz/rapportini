// Rate limiting semplice in-memory
// In produzione, usare Redis per supportare più istanze

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Pulisci le entry scadute ogni 5 minuti
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS = {
  // Login: 5 tentativi ogni 15 minuti
  login: { maxRequests: 20, windowMs: 15 * 60 * 100 },
  // API generiche: 100 richieste al minuto
  api: { maxRequests: 100, windowMs: 60 * 100},
  // Creazione rapportini: 30 al minuto
  createRapportino: { maxRequests: 30, windowMs: 60 * 100 },
  // Ricerca: 60 richieste al minuto
  search: { maxRequests: 60, windowMs: 60 * 100 },
} as const;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // Se non esiste o è scaduta, crea nuova entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }
  
  // Incrementa il contatore
  entry.count++;
  
  // Verifica se ha superato il limite
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Helper per ottenere l'IP dalla request
export function getClientIP(request: Request): string {
  // Prova vari header comuni per proxy/load balancer
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}

// Helper per creare una chiave di rate limit
export function createRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}
