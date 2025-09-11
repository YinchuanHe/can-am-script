import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function POST() {
  try {
    const state = await Storage.getAutomationState();
    
    if (!state) {
      return NextResponse.json({
        success: false,
        message: 'No active automation found'
      });
    }

    if (!state.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Automation is not currently active'
      });
    }

    // Stop the automation by deleting the state
    await Storage.deleteAutomationState(state.sessionId);

    console.log(`Automation stopped manually. Session ID: ${state.sessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Automation stopped successfully',
      sessionId: state.sessionId,
      stoppedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error stopping automation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}