import { NextRequest, NextResponse } from 'next/server';
import { Storage, AutomationState, MultiCourtAutomationState, CourtState } from '@/lib/storage';
import { CourtAPI } from '@/lib/court-api';
import { cronService } from '@/lib/cron-service';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { courtId, courtIds, durationHours } = requestBody;

    // Support both single court (backward compatibility) and multiple courts
    const courts = courtIds || (courtId ? [courtId] : []);

    if (!courts.length) {
      return NextResponse.json(
        { error: 'courtId or courtIds array is required' },
        { status: 400 }
      );
    }

    if (!durationHours || durationHours <= 0) {
      return NextResponse.json(
        { error: 'durationHours must be a positive number' },
        { status: 400 }
      );
    }

    // Check if automation is already running (either single or multi-court)
    const existingSingleState = await Storage.getAutomationState();
    const existingMultiState = await Storage.getMultiCourtAutomationState();
    
    if (existingSingleState && existingSingleState.isActive) {
      const endTime = new Date(existingSingleState.endTime);
      const now = new Date();
      
      if (now < endTime) {
        return NextResponse.json(
          { 
            error: 'Single court automation is already running',
            currentState: existingSingleState
          },
          { status: 409 }
        );
      }
    }

    if (existingMultiState && existingMultiState.isActive) {
      const endTime = new Date(existingMultiState.endTime);
      const now = new Date();
      
      if (now < endTime) {
        return NextResponse.json(
          { 
            error: 'Multi-court automation is already running',
            currentState: existingMultiState
          },
          { status: 409 }
        );
      }
    }

    console.log(`Starting automation for ${courts.length} court(s): ${courts.join(', ')}, duration: ${durationHours} hours`);

    // Handle single court (backward compatibility) vs multi-court
    if (courts.length === 1) {
      return await handleSingleCourtAutomation(courts[0], durationHours);
    } else {
      return await handleMultiCourtAutomation(courts, durationHours);
    }

  } catch (error) {
    console.error('Error starting automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Single court automation (existing logic for backward compatibility)
async function handleSingleCourtAutomation(courtId: string, durationHours: number) {
  // Step 1: Reuse existing users or create new ones if needed
  console.log('Getting 12 users for single court automation...');
  const users = await CourtAPI.reuseOrCreateUsers(12);
  
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

  // Step 4: Save state to Redis
  await Storage.saveAutomationState(automationState);

  // Step 5: Start cron service if not already running
  if (!cronService.isRunning()) {
    await cronService.start();
  }

  console.log(`Single court automation started successfully! Session ID: ${sessionId}`);
  console.log(`Will run until: ${endTime.toISOString()}`);

  return NextResponse.json({
    success: true,
    sessionId,
    message: `Automation started for ${durationHours} hours`,
    state: automationState,
    reservation
  });
}

// Multi-court automation (new logic)
async function handleMultiCourtAutomation(courtIds: string[], durationHours: number) {
  console.log(`Setting up automation for ${courtIds.length} courts...`);
  
  // Fetch court info to get court numbers
  const courtInfoResponse = await fetch('https://queuesystem-be.onrender.com/api/courts/all', {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'x-admin-password': 'canamadmin',
      'Referer': 'https://can-am.vercel.app/'
    }
  });
  
  const courtInfoData = await courtInfoResponse.json();
  const courtInfo = courtInfoData.courts.reduce((acc: any, court: any) => {
    acc[court._id] = court.courtNumber;
    return acc;
  }, {});

  const courtStates: CourtState[] = [];
  const reservations = [];

  // Step 1: Create users and reservations for each court
  for (let i = 0; i < courtIds.length; i++) {
    const courtId = courtIds[i];
    const courtNumber = courtInfo[courtId] || (i + 1); // Fallback to index+1 if not found
    
    console.log(`Setting up court ${courtNumber} (${courtId})...`);
    
    // Create separate set of 12 users for this court
    const users = await CourtAPI.reuseOrCreateUsers(12, courtId);
    
    if (users.length < 12) {
      throw new Error(`Failed to create enough users for court ${courtNumber}. Only created ${users.length}/12 users.`);
    }

    // Make initial reservation for this court
    const reservation = await CourtAPI.makeInitialReservation(courtId, users);
    reservations.push({ courtId, courtNumber, reservation });

    // Create court state
    const courtState: CourtState = {
      courtId,
      courtNumber,
      users,
      currentReservationGroup: 0, // First group (0-3) is currently on court
      lastRotationTime: new Date().toISOString()
    };

    courtStates.push(courtState);
    console.log(`Court ${courtNumber} setup complete with ${users.length} users`);
  }

  // Step 2: Create multi-court automation state
  const sessionId = Storage.generateSessionId();
  const now = new Date();
  const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const multiCourtState: MultiCourtAutomationState = {
    sessionId,
    courts: courtStates,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    isActive: true
  };

  // Step 3: Save state to Redis
  await Storage.saveMultiCourtAutomationState(multiCourtState);

  // Step 4: Start cron service if not already running
  if (!cronService.isRunning()) {
    await cronService.start();
  }

  console.log(`Multi-court automation started successfully! Session ID: ${sessionId}`);
  console.log(`Managing ${courtIds.length} courts until: ${endTime.toISOString()}`);

  return NextResponse.json({
    success: true,
    sessionId,
    message: `Multi-court automation started for ${durationHours} hours on ${courtIds.length} courts`,
    state: multiCourtState,
    reservations
  });
}