import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

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

    // Get automation state
    const state = await Storage.getAutomationState();
    
    if (!state) {
      return NextResponse.json({
        active: false,
        message: 'No automation running'
      });
    }

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
        group0: state.users.slice(0, 4).map(u => u.animalName),
        group1: state.users.slice(4, 8).map(u => u.animalName),
        group2: state.users.slice(8, 12).map(u => u.animalName)
      }
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