import Redis from 'ioredis';

export interface User {
  phoneNumber: string;
  animalName: string;
  isApproved: boolean;
  createdAt: string;
  createdAtISO: string;
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

export interface ReservationStatus {
  currentGroup: User[];
  waitlistGroup1: User[];
  waitlistGroup2: User[];
  nextRotationTime: string;
  timeRemaining: string;
}

// Redis connection singleton
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl);
  }
  return redis;
}

export class Storage {
  private static SESSION_KEY = 'automation:session';
  private static STATE_KEY = (sessionId: string) => `automation:state:${sessionId}`;
  private static TTL = 24 * 60 * 60; // 24 hours in seconds

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
}