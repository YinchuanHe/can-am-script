import { NextResponse } from 'next/server';
import { Storage, AutomationState, MultiCourtAutomationState } from '@/lib/storage';

export async function GET() {
  try {
    // Health check - return basic status first
    if (!process.env.REDIS_URL) {
      return NextResponse.json({
        status: 'healthy',
        active: false,
        message: 'Service running, Redis not configured'
      });
    }

    // Check for multi-court automation first
    const multiState = await Storage.getMultiCourtAutomationState();
    if (multiState) {
      return await handleMultiCourtStatus(multiState);
    }

    // Check for single court automation
    const singleState = await Storage.getAutomationState();
    if (singleState) {
      return await handleSingleCourtStatus(singleState);
    }
    
    // No automation running
    return NextResponse.json({
      active: false,
      message: 'No automation running'
    });

  } catch (error) {
    console.error('Error getting status:', error);
    // Return healthy status even if Redis fails for healthcheck purposes
    return NextResponse.json({
      status: 'healthy',
      active: false,
      message: 'Service running, automation status unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleSingleCourtStatus(state: AutomationState) {
  // Check if automation has expired
  const now = new Date();
  const endTime = new Date(state.endTime);
  
  if (now >= endTime) {
    // Clean up expired automation
    await Storage.deleteAutomationState(state.sessionId);
    return NextResponse.json({
      active: false,
      message: 'Automation expired and cleaned up'
    });
  }

  // Get detailed reservation status
  const reservationStatus = await Storage.getReservationStatus();
  
  // Calculate next rotation time
  const lastRotation = new Date(state.lastRotationTime);
  const nextRotation = new Date(lastRotation.getTime() + 30 * 60 * 1000);
  const timeToNextRotation = Math.max(0, nextRotation.getTime() - now.getTime());
  const minutesToNext = Math.ceil(timeToNextRotation / (60 * 1000));

  return NextResponse.json({
    active: state.isActive,
    sessionId: state.sessionId,
    courtId: state.courtId,
    startTime: state.startTime,
    endTime: state.endTime,
    currentGroup: state.currentReservationGroup,
    lastRotationTime: state.lastRotationTime,
    nextRotationTime: nextRotation.toISOString(),
    minutesToNextRotation: minutesToNext,
    reservationStatus,
    totalUsers: state.users.length,
    userGroups: {
      group0: state.users.slice(0, 4).map((u) => u.animalName),
      group1: state.users.slice(4, 8).map((u) => u.animalName),
      group2: state.users.slice(8, 12).map((u) => u.animalName)
    }
  });
}

async function handleMultiCourtStatus(multiState: MultiCourtAutomationState) {
  // Check if automation has expired
  const now = new Date();
  const endTime = new Date(multiState.endTime);
  
  if (now >= endTime) {
    // Clean up expired automation
    await Storage.deleteMultiCourtAutomationState(multiState.sessionId);
    return NextResponse.json({
      active: false,
      message: 'Multi-court automation expired and cleaned up'
    });
  }

  // Get detailed reservation status for all courts
  const multiCourtStatus = await Storage.getMultiCourtReservationStatus();
  
  // Calculate per-court status
  const courtsStatus = multiState.courts.map((court) => {
    const lastRotation = new Date(court.lastRotationTime);
    const nextRotation = new Date(lastRotation.getTime() + 30 * 60 * 1000);
    const timeToNextRotation = Math.max(0, nextRotation.getTime() - now.getTime());
    const minutesToNext = Math.ceil(timeToNextRotation / (60 * 1000));
    
    return {
      courtId: court.courtId,
      courtNumber: court.courtNumber,
      currentGroup: court.currentReservationGroup,
      lastRotationTime: court.lastRotationTime,
      nextRotationTime: nextRotation.toISOString(),
      minutesToNextRotation: minutesToNext,
      totalUsers: court.users.length,
      userGroups: {
        group0: court.users.slice(0, 4).map((u) => u.animalName),
        group1: court.users.slice(4, 8).map((u) => u.animalName),
        group2: court.users.slice(8, 12).map((u) => u.animalName)
      }
    };
  });

  return NextResponse.json({
    active: multiState.isActive,
    type: 'multi-court',
    sessionId: multiState.sessionId,
    startTime: multiState.startTime,
    endTime: multiState.endTime,
    totalCourts: multiState.courts.length,
    courts: courtsStatus,
    reservationStatus: multiCourtStatus
  });
}