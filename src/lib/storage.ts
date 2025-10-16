import Redis from 'ioredis';
import { checkRedisConnection, RedisConnectionStatus } from './redis-check';

export interface User {
  phoneNumber: string;
  animalName: string;
  isApproved: boolean;
  createdAt: string;
  createdAtISO?: string;
  expiresAt?: string;
}

export interface AutomationState {
  sessionId: string;
  courtId: string;
  users: User[];
  currentReservationGroup: number; // 0, 1, or 2 (which group of 4 is currently on court)
  startTime: string;
  endTime: string;
  lastRotationTime: string;
  isActive: boolean;
}

export interface CourtState {
  courtId: string;
  courtNumber: number;
  users: User[];
  currentReservationGroup: number; // 0, 1, or 2 (which group of 4 is currently on court)
  lastRotationTime: string;
}

export interface MultiCourtAutomationState {
  sessionId: string;
  courts: CourtState[];
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ReservationStatus {
  currentGroup: User[];
  waitlistGroup1: User[];
  waitlistGroup2: User[];
  nextRotationTime: string;
  timeRemaining: string;
}

export interface CourtReservationStatus {
  courtId: string;
  courtNumber: number;
  currentGroup: User[];
  waitlistGroup1: User[];
  waitlistGroup2: User[];
  nextRotationTime: string;
}

export interface MultiCourtReservationStatus {
  courts: CourtReservationStatus[];
  timeRemaining: string;
}

// Redis connection singleton
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';
    console.log('Connecting to Redis:', redisUrl ? 'URL provided' : 'No Redis URL, using localhost');
    
    // Add delay for Railway DNS on first connection
    if (redisUrl.includes('railway.internal')) {
      console.log('⏳ Waiting 3 seconds for Railway DNS before creating Redis connection...');
      const start = Date.now();
      while (Date.now() - start < 3000) {
        // Block until DNS is ready
      }
    }
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 30000,  // 30 second timeout for Railway network
      lazyConnect: false,  // Connect immediately to catch errors early
      family: 0,  // Enable dual-stack (IPv4 + IPv6) DNS resolution for Railway
      enableReadyCheck: true,
      enableOfflineQueue: true,
      retryStrategy: (times) => {
        if (times > 10) {
          console.log(`Redis retry limit reached (${times} attempts), giving up`);
          return null;
        }
        const delay = Math.min(times * 200, 3000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      }
    });

    // Handle connection errors gracefully
    redis.on('error', (err) => {
      // Suppress ETIMEDOUT spam, but log other errors
      if (!err.message.includes('ETIMEDOUT') && !err.message.includes('ECONNREFUSED')) {
        console.log('Redis connection error:', err.message);
      }
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('✅ Redis is ready for commands');
    });
  }
  return redis;
}

export class Storage {
  private static SESSION_KEY = 'automation:session';
  private static STATE_KEY = (sessionId: string) => `automation:state:${sessionId}`;
  private static MULTI_COURT_SESSION_KEY = 'automation:multi:session';
  private static MULTI_COURT_STATE_KEY = (sessionId: string) => `automation:multi:state:${sessionId}`;
  private static TTL = 6 * 60 * 60; // 6 hours in seconds

  static async saveAutomationState(state: AutomationState): Promise<void> {
    try {
      const client = getRedis();
      const stateStr = JSON.stringify(state);
      
      await client.setex(this.STATE_KEY(state.sessionId), this.TTL, stateStr);
      await client.setex(this.SESSION_KEY, this.TTL, state.sessionId);
    } catch (error) {
      console.error('Error saving automation state:', error);
      throw new Error('Failed to save automation state');
    }
  }

  static async getAutomationState(): Promise<AutomationState | null> {
    try {
      const client = getRedis();
      const sessionId = await client.get(this.SESSION_KEY);
      if (!sessionId) return null;

      const stateStr = await client.get(this.STATE_KEY(sessionId));
      if (!stateStr) return null;

      return JSON.parse(stateStr) as AutomationState;
    } catch (error) {
      console.error('Error getting automation state:', error);
      return null;
    }
  }

  static async getAutomationStateById(sessionId: string): Promise<AutomationState | null> {
    try {
      const client = getRedis();
      const stateStr = await client.get(this.STATE_KEY(sessionId));
      if (!stateStr) return null;

      return JSON.parse(stateStr) as AutomationState;
    } catch (error) {
      console.error('Error getting automation state by ID:', error);
      return null;
    }
  }

  static async deleteAutomationState(sessionId?: string): Promise<void> {
    try {
      const client = getRedis();
      
      if (!sessionId) {
        const currentSessionId = await client.get(this.SESSION_KEY);
        if (currentSessionId) {
          sessionId = currentSessionId;
        }
      }

      if (sessionId) {
        await client.del(this.STATE_KEY(sessionId));
      }
      await client.del(this.SESSION_KEY);
    } catch (error) {
      console.error('Error deleting automation state:', error);
      throw new Error('Failed to delete automation state');
    }
  }

  static async isAutomationActive(): Promise<boolean> {
    try {
      const state = await this.getAutomationState();
      if (!state) return false;

      const now = new Date();
      const endTime = new Date(state.endTime);
      
      return state.isActive && now < endTime;
    } catch (error) {
      console.error('Error checking automation status:', error);
      return false;
    }
  }

  static async getReservationStatus(): Promise<ReservationStatus | null> {
    try {
      const state = await this.getAutomationState();
      if (!state) return null;

      const groups = this.getUserGroups(state.users);
      const currentGroup = groups[state.currentReservationGroup];
      
      // Calculate waitlist groups
      const waitlistGroups = groups.filter((_, index) => index !== state.currentReservationGroup);
      
      // Calculate next rotation time (30 minutes from last rotation)
      const lastRotation = new Date(state.lastRotationTime);
      const nextRotation = new Date(lastRotation.getTime() + 30 * 60 * 1000);
      
      // Calculate time remaining in automation
      const endTime = new Date(state.endTime);
      const now = new Date();
      const timeRemainingMs = endTime.getTime() - now.getTime();
      const timeRemainingHours = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60 * 60)));
      const timeRemainingMinutes = Math.max(0, Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));

      return {
        currentGroup,
        waitlistGroup1: waitlistGroups[0] || [],
        waitlistGroup2: waitlistGroups[1] || [],
        nextRotationTime: nextRotation.toISOString(),
        timeRemaining: `${timeRemainingHours}h ${timeRemainingMinutes}m`
      };
    } catch (error) {
      console.error('Error getting reservation status:', error);
      return null;
    }
  }

  static getUserGroups(users: User[]): User[][] {
    // Split 12 users into 3 groups of 4
    const groups: User[][] = [];
    for (let i = 0; i < users.length; i += 4) {
      groups.push(users.slice(i, i + 4));
    }
    return groups;
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async testRedisConnection(): Promise<RedisConnectionStatus> {
    return await checkRedisConnection();
  }

  // Multi-court automation methods
  static async saveMultiCourtAutomationState(state: MultiCourtAutomationState): Promise<void> {
    try {
      const client = getRedis();
      const stateStr = JSON.stringify(state);
      
      await client.setex(this.MULTI_COURT_STATE_KEY(state.sessionId), this.TTL, stateStr);
      await client.setex(this.MULTI_COURT_SESSION_KEY, this.TTL, state.sessionId);
    } catch (error) {
      console.error('Error saving multi-court automation state:', error);
      throw new Error('Failed to save multi-court automation state');
    }
  }

  static async getMultiCourtAutomationState(): Promise<MultiCourtAutomationState | null> {
    try {
      const client = getRedis();
      const sessionId = await client.get(this.MULTI_COURT_SESSION_KEY);
      if (!sessionId) return null;

      const stateStr = await client.get(this.MULTI_COURT_STATE_KEY(sessionId));
      if (!stateStr) return null;

      return JSON.parse(stateStr) as MultiCourtAutomationState;
    } catch (error) {
      console.error('Error getting multi-court automation state:', error);
      return null;
    }
  }

  static async deleteMultiCourtAutomationState(sessionId?: string): Promise<void> {
    try {
      const client = getRedis();
      
      if (!sessionId) {
        const currentSessionId = await client.get(this.MULTI_COURT_SESSION_KEY);
        if (currentSessionId) {
          sessionId = currentSessionId;
        }
      }

      if (sessionId) {
        await client.del(this.MULTI_COURT_STATE_KEY(sessionId));
      }
      await client.del(this.MULTI_COURT_SESSION_KEY);
    } catch (error) {
      console.error('Error deleting multi-court automation state:', error);
      throw new Error('Failed to delete multi-court automation state');
    }
  }

  static async getMultiCourtReservationStatus(): Promise<MultiCourtReservationStatus | null> {
    try {
      const state = await this.getMultiCourtAutomationState();
      if (!state) return null;

      const courts: CourtReservationStatus[] = state.courts.map(court => {
        const groups = this.getUserGroups(court.users);
        const currentGroup = groups[court.currentReservationGroup];
        
        // Calculate waitlist groups
        const waitlistGroups = groups.filter((_, index) => index !== court.currentReservationGroup);
        
        // Calculate next rotation time (30 minutes from last rotation)
        const lastRotation = new Date(court.lastRotationTime);
        const nextRotation = new Date(lastRotation.getTime() + 30 * 60 * 1000);
        
        return {
          courtId: court.courtId,
          courtNumber: court.courtNumber,
          currentGroup,
          waitlistGroup1: waitlistGroups[0] || [],
          waitlistGroup2: waitlistGroups[1] || [],
          nextRotationTime: nextRotation.toISOString()
        };
      });

      // Calculate time remaining in automation
      const endTime = new Date(state.endTime);
      const now = new Date();
      const timeRemainingMs = endTime.getTime() - now.getTime();
      const timeRemainingHours = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60 * 60)));
      const timeRemainingMinutes = Math.max(0, Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));

      return {
        courts,
        timeRemaining: `${timeRemainingHours}h ${timeRemainingMinutes}m`
      };
    } catch (error) {
      console.error('Error getting multi-court reservation status:', error);
      return null;
    }
  }

  static async isMultiCourtAutomationActive(): Promise<boolean> {
    try {
      const state = await this.getMultiCourtAutomationState();
      if (!state) return false;

      const now = new Date();
      const endTime = new Date(state.endTime);
      
      return state.isActive && now < endTime;
    } catch (error) {
      console.error('Error checking multi-court automation status:', error);
      return false;
    }
  }

  static async updateCourtInMultiState(courtId: string, currentGroup: number, lastRotationTime: string): Promise<void> {
    try {
      const state = await this.getMultiCourtAutomationState();
      if (!state) throw new Error('No multi-court automation state found');

      const courtIndex = state.courts.findIndex(court => court.courtId === courtId);
      if (courtIndex === -1) throw new Error(`Court ${courtId} not found in automation state`);

      state.courts[courtIndex].currentReservationGroup = currentGroup;
      state.courts[courtIndex].lastRotationTime = lastRotationTime;

      await this.saveMultiCourtAutomationState(state);
    } catch (error) {
      console.error('Error updating court in multi-state:', error);
      throw new Error('Failed to update court state');
    }
  }
}