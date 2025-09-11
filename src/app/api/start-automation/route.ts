import { NextRequest, NextResponse } from 'next/server';
import { Storage, AutomationState } from '@/lib/storage';
import { CourtAPI } from '@/lib/court-api';

export async function POST(request: NextRequest) {
  try {
    const { courtId, durationHours } = await request.json();

    if (!courtId) {
      return NextResponse.json(
        { error: 'courtId is required' },
        { status: 400 }
      );
    }

    if (!durationHours || durationHours <= 0) {
      return NextResponse.json(
        { error: 'durationHours must be a positive number' },
        { status: 400 }
      );
    }

    // Check if automation is already running
    const existingState = await Storage.getAutomationState();
    if (existingState && existingState.isActive) {
      const endTime = new Date(existingState.endTime);
      const now = new Date();
      
      if (now < endTime) {
        return NextResponse.json(
          { 
            error: 'Automation is already running',
            currentState: existingState
          },
          { status: 409 }
        );
      }
    }

    console.log(`Starting automation for court ${courtId}, duration: ${durationHours} hours`);

    // Step 1: Create and approve users
    console.log('Creating and approving 12 users...');
    const users = await CourtAPI.createAndApproveUsers(12);
    
    if (users.length < 12) {
      return NextResponse.json(
        { 
          error: `Failed to create enough users. Only created ${users.length}/12 users.`,
          partialUsers: users
        },
        { status: 500 }
      );
    }

    // Step 2: Make initial reservation
    console.log('Making initial court reservation...');
    const reservation = await CourtAPI.makeInitialReservation(courtId, users);

    // Step 3: Create automation state
    const sessionId = Storage.generateSessionId();
    const now = new Date();
    const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const automationState: AutomationState = {
      sessionId,
      courtId,
      users,
      currentReservationGroup: 0, // First group (0-3) is currently on court
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      lastRotationTime: now.toISOString(),
      isActive: true
    };

    // Step 4: Save state to KV
    await Storage.saveAutomationState(automationState);

    console.log(`Automation started successfully! Session ID: ${sessionId}`);
    console.log(`Will run until: ${endTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: `Automation started for ${durationHours} hours`,
      state: automationState,
      reservation
    });

  } catch (error) {
    console.error('Error starting automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}