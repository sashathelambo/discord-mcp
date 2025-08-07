/**
 * Optimized Discord Service Implementation
 * 
 * This implementation demonstrates enterprise-grade performance optimizations
 * for the Discord MCP server, focusing on memory management, connection pooling,
 * and efficient API usage patterns.
 */

import { 
  Client, 
  GatewayIntentBits, 
  Options,
  LimitedCollection,
  Guild,
  TextChannel,
  Message,
  User,
  GuildMember,
  CategoryChannel,
  ChannelType
} from 'discord.js';
import { Agent } from 'https';
import { EventEmitter } from 'events';

// Smart Cache Implementation
class SmartCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number; size: number }>();
  private maxSize: number;
  private maxMemory: number;
  private currentMemory: number = 0;
  private ttl: number;
  
  constructor(maxSize = 10000, ttl = 300000, maxMemoryMB = 100) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
  }
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.currentMemory -= entry.size;
      this.cache.delete(key);
      return undefined;
    }
    
    // Update access count for LRU
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.value;
  }
  
  set(key: K, value: V): void {
    const size = this.estimateSize(value);
    
    // Memory-based eviction
    while (this.currentMemory + size > this.maxMemory && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // Size-based eviction
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemory -= existing.size;
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    });
    
    this.currentMemory += size;
  }
  
  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruScore = Infinity;
    
    // Score = accessCount / age (lower is worse)
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      const age = (now - entry.timestamp) / 1000; // Convert to seconds
      const score = entry.accessCount / Math.max(age, 1);
      
      if (score < lruScore) {
        lruKey = key;
        lruScore = score;
      }
    }
    
    if (lruKey !== undefined) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        this.currentMemory -= entry.size;
      }
      this.cache.delete(lruKey);
    }
  }
  
  private estimateSize(value: any): number {
    // Rough estimation of object size in bytes
    const json = JSON.stringify(value);
    return json.length * 2; // UTF-16 encoding approximation
  }
  
  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }
  
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemory,
      memoryUsageMB: this.currentMemory / 1024 / 1024,
      hitRate: this.calculateHitRate()
    };
  }
  
  private calculateHitRate(): number {
    // Simple hit rate calculation based on access patterns
    if (this.cache.size === 0) return 0;
    
    const totalAccess = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return totalAccess / this.cache.size;
  }
}

// Request Deduplication and Batching
class RequestManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueues = new Map<string, Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    request: () => Promise<any>;
    timestamp: number;
  }>>();
  
  // Deduplication: prevent duplicate requests
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  // Batching: group similar requests
  async batch<T>(
    batchKey: string, 
    request: () => Promise<T>, 
    delay = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueues.has(batchKey)) {
        this.batchQueues.set(batchKey, []);
        
        // Process batch after delay
        setTimeout(async () => {
          const batch = this.batchQueues.get(batchKey) || [];
          this.batchQueues.delete(batchKey);
          
          // Execute all requests in parallel
          const results = await Promise.allSettled(
            batch.map(item => item.request())
          );
          
          // Resolve/reject individual promises
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              batch[index].resolve(result.value);
            } else {
              batch[index].reject(result.reason);
            }
          });
        }, delay);
      }
      
      this.batchQueues.get(batchKey)!.push({
        resolve,
        reject,
        request,
        timestamp: Date.now()
      });
    });
  }
  
  // Circuit breaker pattern
  private circuitStates = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }>();
  
  async withCircuitBreaker<T>(
    key: string,
    requestFn: () => Promise<T>,
    options = { failureThreshold: 5, recoveryTimeout: 60000 }
  ): Promise<T> {
    const circuit = this.circuitStates.get(key) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    };
    
    const now = Date.now();
    
    // Check if circuit should transition from open to half-open
    if (circuit.state === 'open' && now - circuit.lastFailure > options.recoveryTimeout) {
      circuit.state = 'half-open';
    }
    
    // Reject if circuit is open
    if (circuit.state === 'open') {
      throw new Error(`Circuit breaker is open for ${key}`);
    }
    
    try {
      const result = await requestFn();
      
      // Success: reset circuit
      circuit.failures = 0;
      circuit.state = 'closed';
      this.circuitStates.set(key, circuit);
      
      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailure = now;
      
      // Open circuit if threshold reached
      if (circuit.failures >= options.failureThreshold) {
        circuit.state = 'open';
      }
      
      this.circuitStates.set(key, circuit);
      throw error;
    }
  }
  
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      batchQueues: this.batchQueues.size,
      circuits: Array.from(this.circuitStates.entries()).map(([key, state]) => ({
        key,
        ...state
      }))
    };
  }
}

// Connection Pool Manager
class ConnectionPoolManager {
  private httpAgent: Agent;
  private httpsAgent: Agent;
  
  constructor() {
    this.httpAgent = new Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      keepAliveMsecs: 30000
    });
    
    this.httpsAgent = new Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      keepAliveMsecs: 30000
    });
  }
  
  getAgent(protocol: 'http' | 'https' = 'https'): Agent {
    return protocol === 'https' ? this.httpsAgent : this.httpAgent;
  }
  
  getStats() {
    return {
      http: {
        sockets: this.httpAgent.sockets,
        freeSockets: this.httpAgent.freeSockets,
        requests: this.httpAgent.requests
      },
      https: {
        sockets: this.httpsAgent.sockets,
        freeSockets: this.httpsAgent.freeSockets,
        requests: this.httpsAgent.requests
      }
    };
  }
  
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// Optimized Discord Service
export class OptimizedDiscordService extends EventEmitter {
  private client: Client;
  private defaultGuildId?: string;
  private isReady = false;
  
  // Performance optimizations
  private cache: SmartCache<string, any>;
  private requestManager: RequestManager;
  private connectionPool: ConnectionPoolManager;
  
  // Metrics tracking
  private metrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    responseTime: [] as number[]
  };
  
  constructor() {
    super();
    
    // Initialize performance components
    this.cache = new SmartCache(20000, 300000, 200); // 200MB cache limit
    this.requestManager = new RequestManager();
    this.connectionPool = new ConnectionPoolManager();
    
    // Configure Discord client with optimizations
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
      ],
      
      // Critical memory management configuration
      makeCache: Options.cacheWithLimits({
        MessageManager: {
          maxSize: 2000,
          sweepInterval: 300, // 5 minutes
          sweepFilter: LimitedCollection.filterByLifetime({
            lifetime: 1800, // 30 minutes
            getComparisonTimestamp: m => m.editedTimestamp ?? m.createdTimestamp,
          })
        },
        GuildMemberManager: {
          maxSize: 20000,
          sweepInterval: 1800, // 30 minutes
          sweepFilter: LimitedCollection.filterByLifetime({
            lifetime: 3600, // 1 hour
          })
        },
        UserManager: {
          maxSize: 10000,
          sweepInterval: 1800,
          sweepFilter: LimitedCollection.filterByLifetime({
            lifetime: 3600,
          })
        },
        GuildChannelManager: {
          maxSize: 5000,
          sweepInterval: 3600, // 1 hour - channels change less frequently
        },
        RoleManager: {
          maxSize: 2000,
          sweepInterval: 3600,
        },
        // Disable caching for less important data
        PresenceManager: 0,
        GuildBanManager: 0,
        InviteManager: 0,
        VoiceStateManager: {
          maxSize: 100, // Small cache for active voice states
          sweepInterval: 300,
        }
      }),
      
      // Message edit history limit
      messageEditHistoryMaxSize: 25,
      
      // REST API optimizations
      rest: {
        agent: this.connectionPool.getAgent(),
        retries: 3,
        timeout: 15000,
        // Rate limit handling
        globalRequestsPerSecond: 50,
        // Request compression
        userAgentSuffix: ['OptimizedMCP/1.0'],
        // Connection reuse
        rejectOnRateLimit: null, // Handle rate limits gracefully
      }
    });
    
    this.defaultGuildId = process.env.DISCORD_GUILD_ID;
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      console.log(`Optimized Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      this.emit('ready');
      
      // Start cache cleanup intervals
      this.startCacheCleanup();
    });
    
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.metrics.errors++;
      this.emit('error', error);
    });
    
    // Monitor memory usage
    this.client.on('debug', (info) => {
      if (info.includes('memory')) {
        this.emit('debug', { type: 'memory', info });
      }
    });
  }
  
  private startCacheCleanup(): void {
    // Periodic cache statistics and cleanup
    setInterval(() => {
      const cacheStats = this.cache.getStats();
      const requestStats = this.requestManager.getStats();
      
      this.emit('performance', {
        cache: cacheStats,
        requests: requestStats,
        metrics: this.getPerformanceMetrics(),
        memory: process.memoryUsage()
      });
      
      // Force cache cleanup if memory usage is high
      if (cacheStats.memoryUsageMB > 150) {
        console.log('High cache memory usage, triggering cleanup');
        this.cache.clear();
      }
    }, 60000); // Every minute
    
    // Garbage collection monitoring
    if (global.gc) {
      setInterval(() => {
        const memBefore = process.memoryUsage();
        global.gc();
        const memAfter = process.memoryUsage();
        const reclaimed = memBefore.heapUsed - memAfter.heapUsed;
        
        if (reclaimed > 10 * 1024 * 1024) { // 10MB
          console.log(`GC reclaimed ${(reclaimed / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 300000); // Every 5 minutes
    }
  }
  
  async initialize(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error("ERROR: DISCORD_TOKEN environment variable not set");
      process.exit(1);
    }
    
    return new Promise((resolve, reject) => {
      this.client.once('ready', resolve);
      this.client.on('error', reject);
      this.client.login(token);
    });
  }
  
  // Optimized message sending with caching and deduplication
  async sendMessage(channelId: string, message: string): Promise<any> {
    const start = performance.now();
    
    try {
      // Use circuit breaker pattern
      const result = await this.requestManager.withCircuitBreaker(
        `sendMessage-${channelId}`,
        async () => {
          // Deduplicate identical messages sent rapidly
          const dedupeKey = `msg-${channelId}-${message.substring(0, 50)}`;
          
          return await this.requestManager.deduplicate(dedupeKey, async () => {
            const channel = await this.getChannelOptimized(channelId) as TextChannel;
            const sentMessage = await channel.send(message);
            
            // Cache the sent message briefly
            this.cache.set(`message-${sentMessage.id}`, {
              id: sentMessage.id,
              content: sentMessage.content,
              channelId: sentMessage.channelId,
              authorId: sentMessage.author.id,
              timestamp: sentMessage.createdTimestamp
            });
            
            return {
              messageId: sentMessage.id,
              timestamp: sentMessage.createdTimestamp,
              channelId: sentMessage.channelId
            };
          });
        }
      );
      
      this.metrics.apiCalls++;
      this.metrics.responseTime.push(performance.now() - start);
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  // Optimized channel retrieval with smart caching
  private async getChannelOptimized(channelId: string): Promise<any> {
    const cacheKey = `channel-${channelId}`;
    
    // Try cache first
    let channel = this.cache.get(cacheKey);
    if (channel) {
      this.metrics.cacheHits++;
      return channel;
    }
    
    this.metrics.cacheMisses++;
    
    // Try Discord.js cache
    channel = this.client.channels.cache.get(channelId);
    if (channel) {
      // Store in our smart cache
      this.cache.set(cacheKey, channel);
      return channel;
    }
    
    // Fetch from API as last resort
    channel = await this.client.channels.fetch(channelId);
    this.cache.set(cacheKey, channel);
    
    return channel;
  }
  
  // Batch message reading for efficiency
  async readMessages(channelId: string, count = 50): Promise<any[]> {
    const start = performance.now();
    
    try {
      const result = await this.requestManager.batch(
        'readMessages',
        async () => {
          const channel = await this.getChannelOptimized(channelId) as TextChannel;
          
          // Check cache first
          const cacheKey = `messages-${channelId}-${count}`;
          const cached = this.cache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 30000) { // 30 seconds
            this.metrics.cacheHits++;
            return cached.messages;
          }
          
          this.metrics.cacheMisses++;
          
          const messages = await channel.messages.fetch({ 
            limit: Math.min(count, 100) // Discord API limit
          });
          
          const formattedMessages = Array.from(messages.values()).map(msg => ({
            id: msg.id,
            content: msg.content,
            author: {
              id: msg.author.id,
              username: msg.author.username,
              displayName: msg.author.displayName
            },
            timestamp: msg.createdTimestamp,
            editedTimestamp: msg.editedTimestamp,
            attachments: msg.attachments.map(att => ({
              id: att.id,
              name: att.name,
              size: att.size,
              url: att.url,
              contentType: att.contentType
            }))
          }));
          
          // Cache the results
          this.cache.set(cacheKey, {
            messages: formattedMessages,
            timestamp: Date.now()
          });
          
          return formattedMessages;
        }
      );
      
      this.metrics.apiCalls++;
      this.metrics.responseTime.push(performance.now() - start);
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  // Optimized guild information with aggressive caching
  async getServerInfo(guildId?: string): Promise<any> {
    const resolvedGuildId = guildId || this.defaultGuildId;
    if (!resolvedGuildId) {
      throw new Error('No guild ID provided and no default guild configured');
    }
    
    const cacheKey = `guild-info-${resolvedGuildId}`;
    
    // Check cache (guild info changes infrequently, cache longer)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      this.metrics.cacheHits++;
      return cached.data;
    }
    
    this.metrics.cacheMisses++;
    
    try {
      const guild = this.client.guilds.cache.get(resolvedGuildId) || 
                   await this.client.guilds.fetch(resolvedGuildId);
      
      const guildInfo = {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.memberCount,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        channels: {
          total: guild.channels.cache.size,
          text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
          voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
          categories: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size
        },
        roles: guild.roles.cache.size,
        emojis: guild.emojis.cache.size,
        stickers: guild.stickers.cache.size,
        createdAt: guild.createdAt,
        ownerId: guild.ownerId,
        verificationLevel: guild.verificationLevel,
        features: guild.features
      };
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, {
        data: guildInfo,
        timestamp: Date.now()
      });
      
      this.metrics.apiCalls++;
      
      return guildInfo;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  // Performance monitoring methods
  getPerformanceMetrics() {
    const responseTime = this.metrics.responseTime;
    const avgResponseTime = responseTime.length > 0 ? 
      responseTime.reduce((sum, time) => sum + time, 0) / responseTime.length : 0;
    
    const p95ResponseTime = responseTime.length > 0 ?
      responseTime.sort((a, b) => a - b)[Math.floor(responseTime.length * 0.95)] : 0;
    
    const cacheHitRate = (this.metrics.cacheHits / 
      (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 || 0;
    
    return {
      apiCalls: this.metrics.apiCalls,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
      p95ResponseTime: p95ResponseTime.toFixed(2) + 'ms',
      errorRate: ((this.metrics.errors / this.metrics.apiCalls) * 100 || 0).toFixed(2) + '%',
      cacheStats: this.cache.getStats(),
      connectionStats: this.connectionPool.getStats()
    };
  }
  
  // Cleanup method
  async cleanup(): Promise<void> {
    console.log('Cleaning up optimized Discord service...');
    
    this.cache.clear();
    this.connectionPool.destroy();
    
    if (this.client) {
      this.client.destroy();
    }
    
    console.log('Cleanup complete');
  }
  
  // Health check method
  isHealthy(): boolean {
    const metrics = this.getPerformanceMetrics();
    const memUsage = process.memoryUsage();
    
    // Health checks
    const memoryOK = memUsage.heapUsed < 1024 * 1024 * 1024; // < 1GB
    const responseTimeOK = parseFloat(metrics.averageResponseTime) < 1000; // < 1s
    const errorRateOK = parseFloat(metrics.errorRate) < 5; // < 5%
    const clientReady = this.isReady && this.client.readyAt !== null;
    
    return memoryOK && responseTimeOK && errorRateOK && clientReady;
  }
}

export default OptimizedDiscordService;