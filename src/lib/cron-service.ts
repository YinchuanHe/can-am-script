import { Storage } from './storage';
import { CourtAPI } from './court-api';

class CronService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly ROTATION_INTERVAL = 30 * 60 * 1000; // 30 minutes

  async start(): Promise<void> {
    if (this.intervalId) {
      console.log('Cron service already running');
      return;
    }

    console.log('Starting cron service for 30-minute rotations...');
    
    // Run immediately once
    await this.executeRotation();
    
    // Then run every 30 minutes
    this.intervalId = setInterval(async () => {
      await this.executeRotation();
    }, this.ROTATION_INTERVAL);

    console.log('Cron service started successfully');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Cron service stopped');
    }
  }

  private async executeRotation(): Promise<void> {
    try {
      console.log('Checking for active automation...');

      const state = await Storage.getAutomationState();
      
      if (!state) {
        console.log('No active automation found');
        return;
      }

      if (!state.isActive) {
        console.log('Automation is not active');
        return;
      }

      const now = new Date();
      const endTime = new Date(state.endTime);
      
      // Check if automation should end
      if (now >= endTime) {
        console.log('Automation duration expired, stopping...');
        await Storage.deleteAutomationState(state.sessionId);
        return;
      }

      // Check if it's time to rotate (30 minutes since last rotation)
      const lastRotation = new Date(state.lastRotationTime);
      const timeSinceLastRotation = now.getTime() - lastRotation.getTime();
      
      if (timeSinceLastRotation < this.ROTATION_INTERVAL) {
        const timeToNextRotation = this.ROTATION_INTERVAL - timeSinceLastRotation;
        const minutesToNext = Math.ceil(timeToNextRotation / (60 * 1000));
        
        console.log(`Not time to rotate yet. ${minutesToNext} minutes remaining.`);
        return;
      }

      // Time to rotate!
      console.log('Time to rotate reservation...');
      
      const newCurrentGroup = await CourtAPI.rotateReservation(
        state.courtId,
        state.users,
        state.currentReservationGroup
      );

      // Update state with new current group and rotation time
      const updatedState = {
        ...state,
        currentReservationGroup: newCurrentGroup,
        lastRotationTime: now.toISOString()
      };

      await Storage.saveAutomationState(updatedState);

      const groups = Storage.getUserGroups(state.users);
      const newGroupUsers = groups[newCurrentGroup].map(u => u.animalName);

      console.log(`Successfully rotated to group ${newCurrentGroup}: ${newGroupUsers.join(', ')}`);

    } catch (error) {
      console.error('Error in cron rotation:', error);
      
      // Try to mark automation as inactive due to error
      try {
        const state = await Storage.getAutomationState();
        if (state) {
          const errorState = { ...state, isActive: false };
          await Storage.saveAutomationState(errorState);
        }
      } catch (storageError) {
        console.error('Failed to update state after error:', storageError);
      }
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// Export singleton instance
export const cronService = new CronService();