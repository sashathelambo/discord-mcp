export class DiscordAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly method?: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'DiscordAPIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number,
    public readonly global: boolean
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ErrorHandler {
  static handle(error: any): never {
    // Log the error for debugging
    console.error('Discord MCP Error:', error);
    
    // Re-throw specific error types
    if (error instanceof DiscordAPIError) {
      throw error;
    }
    
    if (error instanceof ValidationError) {
      throw error;
    }
    
    if (error instanceof PermissionError) {
      throw error;
    }
    
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    // Handle Discord.js errors
    if (error.name === 'DiscordAPIError') {
      throw new DiscordAPIError(
        error.message,
        error.code,
        error.method,
        error.path
      );
    }
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      throw new ValidationError(`Validation failed: ${error.message}`);
    }
    
    // Handle generic errors
    if (error instanceof Error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
    
    // Handle unknown errors
    throw new Error(`Unknown error occurred: ${String(error)}`);
  }
  
  static createRateLimitError(retryAfter: number, global: boolean): RateLimitError {
    return new RateLimitError(
      `Rate limited. Try again in ${retryAfter}ms`,
      retryAfter,
      global
    );
  }
  
  static createPermissionError(message: string): PermissionError {
    return new PermissionError(`Permission denied: ${message}`);
  }
  
  static createValidationError(message: string): ValidationError {
    return new ValidationError(`Invalid input: ${message}`);
  }
}