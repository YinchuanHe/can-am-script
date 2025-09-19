import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function POST() {
  try {
    // Check for multi-court automation first
    const multiState = await Storage.getMultiCourtAutomationState();
    if (multiState) {
      if (!multiState.isActive) {
        return NextResponse.json({
          success: false,
          message: 'Multi-court automation is not currently active'
        });
      }

      // Stop the multi-court automation by deleting the state
      await Storage.deleteMultiCourtAutomationState(multiState.sessionId);

      console.log(`Multi-court automation stopped manually. Session ID: ${multiState.sessionId}`);

      return NextResponse.json({
        success: true,
        message: `Multi-court automation stopped successfully (${multiState.courts.length} courts)`,
        sessionId: multiState.sessionId,
        type: 'multi-court',
        courtsCount: multiState.courts.length,
        stoppedAt: new Date().toISOString()
      });
    }

    // Check for single court automation
    const singleState = await Storage.getAutomationState();
    if (singleState) {
      if (!singleState.isActive) {
        return NextResponse.json({
          success: false,
          message: 'Single court automation is not currently active'
        });
      }

      // Stop the single court automation by deleting the state
      await Storage.deleteAutomationState(singleState.sessionId);

      console.log(`Single court automation stopped manually. Session ID: ${singleState.sessionId}`);

      return NextResponse.json({
        success: true,
        message: 'Single court automation stopped successfully',
        sessionId: singleState.sessionId,
        type: 'single-court',
        stoppedAt: new Date().toISOString()
      });
    }

    // No automation found
    return NextResponse.json({
      success: false,
      message: 'No active automation found'
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