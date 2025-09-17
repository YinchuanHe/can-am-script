import { User } from './storage';

const BASE_URL = 'https://queuesystem-be.onrender.com/api';
const ADMIN_PASSWORD = 'canamadmin';
const REFERER = 'https://can-am.vercel.app/';

const DEFAULT_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'priority': 'u=1, i',
  'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  'x-admin-password': ADMIN_PASSWORD,
  'Referer': REFERER
};

export interface RegisterResponse {
  success: boolean;
  user: User;
  isExisting: boolean;
}

export interface ApprovalResponse {
  success: boolean;
  message?: string;
}

export interface ReservationResponse {
  success: boolean;
  court: {
    _id: string;
    name: string;
    courtNumber: number;
    isVisible: boolean;
    currentReservation: {
      _id: string;
      courtId: string;
      userIds: string[];
      type: string;
      option: string | null;
      startTime: string;
      endTime: string;
    };
    waitlist: unknown[];
    isAvailable: boolean;
    waitlistCount: number;
    timeToAvailable: number;
  };
}

export interface ExistingUsersResponse {
  success: boolean;
  activeUsers: Record<string, User>;
  idleUsers: Record<string, User>;
}

export class CourtAPI {
  static generateRandomPhoneNumber(): string {
    // Generate random 5-digit phone number
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  static async registerUser(phoneNumber: string): Promise<RegisterResponse> {
    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ phoneNumber })
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw new Error(`Failed to register user with phone ${phoneNumber}`);
    }
  }

  static async approveUser(animalName: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${BASE_URL}/admin/users/approve`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ animalName })
      });

      if (!response.ok) {
        throw new Error(`Approval failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error approving user:', error);
      throw new Error(`Failed to approve user ${animalName}`);
    }
  }

  static async reserveCourt(
    courtId: string, 
    userIds: string[], 
    type: string = 'full', 
    option: string = 'queue'
  ): Promise<ReservationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/reserve`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ courtId, userIds, type, option })
      });

      if (!response.ok) {
        throw new Error(`Reservation failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error reserving court:', error);
      throw new Error(`Failed to reserve court ${courtId}`);
    }
  }

  static async createAndApproveUsers(count: number = 12): Promise<User[]> {
    const users: User[] = [];
    const phoneNumbers = new Set<string>();

    // Generate unique phone numbers
    while (phoneNumbers.size < count) {
      phoneNumbers.add(this.generateRandomPhoneNumber());
    }

    // Register all users
    console.log(`Registering ${count} users...`);
    for (const phoneNumber of phoneNumbers) {
      try {
        const registerResult = await this.registerUser(phoneNumber);
        if (registerResult.success) {
          users.push(registerResult.user);
          console.log(`Registered user: ${registerResult.user.animalName} (${phoneNumber})`);
        }
      } catch (error) {
        console.error(`Failed to register user with phone ${phoneNumber}:`, error);
        // Continue with other users even if one fails
      }
    }

    // Approve all users
    console.log(`Approving ${users.length} users...`);
    for (const user of users) {
      try {
        await this.approveUser(user.animalName);
        user.isApproved = true;
        console.log(`Approved user: ${user.animalName}`);
      } catch (error) {
        console.error(`Failed to approve user ${user.animalName}:`, error);
        // Continue with other users even if one fails
      }
    }

    if (users.length < count) {
      console.warn(`Only successfully created ${users.length} out of ${count} requested users`);
    }

    return users;
  }

  static async makeInitialReservation(courtId: string, users: User[]): Promise<ReservationResponse> {
    if (users.length < 12) {
      throw new Error(`Need at least 12 users, got ${users.length}`);
    }

    // First 4 users reserve the court
    const firstGroup = users.slice(0, 4).map(u => u.animalName);
    console.log(`Making initial reservation with users: ${firstGroup.join(', ')}`);
    
    const reservation = await this.reserveCourt(courtId, firstGroup, 'full', 'queue');

    // Wait 1 second for court API to process the first group
    console.log('Waiting 1 second for API to process...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add remaining users to waitlist in groups of 4
    const secondGroup = users.slice(4, 8).map(u => u.animalName);
    const thirdGroup = users.slice(8, 12).map(u => u.animalName);

    console.log(`Adding second group to waitlist: ${secondGroup.join(', ')}`);
    await this.reserveCourt(courtId, secondGroup, 'full', 'queue');

    // Wait 1 second for court API to process the second group
    console.log('Waiting 1 second for API to process...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Adding third group to waitlist: ${thirdGroup.join(', ')}`);
    await this.reserveCourt(courtId, thirdGroup, 'full', 'queue');

    return reservation;
  }

  static async fetchExistingUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${BASE_URL}/admin/users`, {
        method: 'GET',
        headers: DEFAULT_HEADERS
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data: ExistingUsersResponse = await response.json();
      
      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }

      // Combine active and idle users, filter for approved and non-expired
      const allUsers = [
        ...Object.values(data.activeUsers),
        ...Object.values(data.idleUsers)
      ];

      const now = new Date();
      const approvedUsers = allUsers.filter(user => {
        const expiresAt = new Date(user.expiresAt || '');
        return user.isApproved && expiresAt > now;
      });

      console.log(`Found ${approvedUsers.length} approved, non-expired users`);
      return approvedUsers;
    } catch (error) {
      console.error('Error fetching existing users:', error);
      throw new Error('Failed to fetch existing users');
    }
  }

  static async reuseOrCreateUsers(count: number = 12): Promise<User[]> {
    console.log(`Need ${count} users for automation...`);
    
    try {
      // First, check Redis for existing approved users from previous automations
      const { Storage } = await import('./storage');
      const existingState = await Storage.getAutomationState();
      
      if (existingState?.users) {
        // Filter for approved, non-expired users (6-hour expiration)
        const now = new Date();
        const validUsers = existingState.users.filter(user => {
          if (!user.isApproved) return false;
          if (!user.expiresAt) return false;
          const expiresAt = new Date(user.expiresAt);
          return expiresAt > now;
        });

        if (validUsers.length >= count) {
          console.log(`Using ${count} existing approved users from Redis (${validUsers.length} available)`);
          return validUsers.slice(0, count);
        }
        
        console.log(`Found ${validUsers.length} valid users in Redis, need ${count - validUsers.length} more`);
      }
      
      // If not enough users in Redis, create new batch of 12 users with 6-hour expiration
      console.log('Creating new batch of 12 users with 6-hour expiration...');
      const newUsers = await this.createAndApproveUsers(12);
      
      // Set 6-hour expiration on newly created users
      const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
      newUsers.forEach(user => {
        user.expiresAt = sixHoursFromNow.toISOString();
      });
      
      console.log(`Created ${newUsers.length} new users with expiration: ${sixHoursFromNow.toISOString()}`);
      return newUsers.slice(0, count);
      
    } catch (error) {
      console.error('Error in reuseOrCreateUsers, falling back to creating all new users:', error);
      // Fallback to original behavior if Redis check fails
      const fallbackUsers = await this.createAndApproveUsers(count);
      
      // Set 6-hour expiration on fallback users
      const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
      fallbackUsers.forEach(user => {
        user.expiresAt = sixHoursFromNow.toISOString();
      });
      
      return fallbackUsers;
    }
  }

  static async rotateReservation(courtId: string, users: User[], currentGroup: number): Promise<number> {
    // Calculate the next group (0, 1, 2 rotation)
    const nextGroup = (currentGroup + 1) % 3;
    const groups = [
      users.slice(0, 4),   // Group 0
      users.slice(4, 8),   // Group 1  
      users.slice(8, 12)   // Group 2
    ];

    const nextGroupUsers = groups[nextGroup].map(u => u.animalName);
    
    console.log(`Rotating to group ${nextGroup}: ${nextGroupUsers.join(', ')}`);
    
    try {
      // Wait 500ms before making rotation request to ensure API is ready
      console.log('Waiting 500ms before rotation...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Make reservation with next group (this should move them from waitlist to court)
      await this.reserveCourt(courtId, nextGroupUsers, 'full', 'queue');
      
      // Previous group should automatically be added back to waitlist
      console.log(`Group ${nextGroup} now has the court`);
      
      return nextGroup;
    } catch (error) {
      console.error('Error during rotation:', error);
      throw error;
    }
  }
}