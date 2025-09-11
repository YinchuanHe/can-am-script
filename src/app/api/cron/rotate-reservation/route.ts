import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { CourtAPI } from '@/lib/court-api';

export async function GET(request: NextRequest) {
  try {
    console.log('Cron job triggered: Checking for active automation...');

    // Get current automation state
    const state = await Storage.getAutomationState();
    
    if (!state) {
      console.log('No active automation found');
      return NextResponse.json({ 
        message: 'No active automation found',
        action: 'none'
      });
    }

    if (!state.isActive) {
      console.log('Automation is not active');
      return NextResponse.json({ 
        message: 'Automation is not active',
        action: 'none'
      });
    }

    const now = new Date();
    const endTime = new Date(state.endTime);
    
    // Check if automation should end
    if (now >= endTime) {
      console.log('Automation duration expired, stopping...');
      await Storage.deleteAutomationState(state.sessionId);
      return NextResponse.json({ 
        message: 'Automation duration expired, stopped automation',
        action: 'stopped',
        sessionId: state.sessionId
      });
    }

    // Check if it's time to rotate (30 minutes since last rotation)
    const lastRotation = new Date(state.lastRotationTime);
    const timeSinceLastRotation = now.getTime() - lastRotation.getTime();
    const thirtyMinutesMs = 30 * 60 * 1000;
    
    if (timeSinceLastRotation < thirtyMinutesMs) {
      const timeToNextRotation = thirtyMinutesMs - timeSinceLastRotation;
      const minutesToNext = Math.ceil(timeToNextRotation / (60 * 1000));
      
      console.log(`Not time to rotate yet. ${minutesToNext} minutes remaining.`);
      return NextResponse.json({ 
        message: `Next rotation in ${minutesToNext} minutes`,
        action: 'waiting',
        nextRotationIn: minutesToNext
      });
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

    return NextResponse.json({
      success: true,
      message: `Rotated to group ${newCurrentGroup}`,
      action: 'rotated',
      currentGroup: newCurrentGroup,
      currentUsers: newGroupUsers,
      nextRotationTime: new Date(now.getTime() + thirtyMinutesMs).toISOString(),
      sessionId: state.sessionId
    });

  } catch (error) {
    console.error('Error in cron rotation:', error);
    
    // Try to get state for error reporting
    try {
      const state = await Storage.getAutomationState();
      if (state) {
        // Mark automation as inactive due to error
        const errorState = { ...state, isActive: false };
        await Storage.saveAutomationState(errorState);
      }
    } catch (storageError) {
      console.error('Failed to update state after error:', storageError);
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        action: 'error'
      },
      { status: 500 }
    );
  }
}

// Also handle POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}