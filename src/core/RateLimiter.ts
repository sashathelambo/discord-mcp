export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, { resetTime: number; remaining: number }>;
  private globalRateLimitReset: number = 0;

  private constructor() {
    this.limits = new Map();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  isGlobalRateLimited(): boolean {
    return Date.now() < this.globalRateLimitReset;
  }

  setGlobalRateLimit(resetAfter: number): void {
    this.globalRateLimitReset = Date.now() + resetAfter;
  }

  isRateLimited(bucket: string): boolean {
    const limit = this.limits.get(bucket);
    if (!limit) return false;
    
    // Check if we're still in the rate limit window
    if (Date.now() < limit.resetTime) {
      // Check if we have remaining requests
      return limit.remaining <= 0;
    }
    
    // Rate limit window has expired, remove it
    this.limits.delete(bucket);
    return false;
  }

  updateRateLimit(bucket: string, remaining: number, resetAfter: number): void {
    this.limits.set(bucket, {
      remaining,
      resetTime: Date.now() + resetAfter
    });
  }

  async waitForRateLimit(bucket: string): Promise<void> {
    // Check global rate limit first
    if (this.isGlobalRateLimited()) {
      const waitTime = this.globalRateLimitReset - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
    
    // Check bucket-specific rate limit
    const limit = this.limits.get(bucket);
    if (limit && limit.resetTime > Date.now() && limit.remaining <= 0) {
      const waitTime = limit.resetTime - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}