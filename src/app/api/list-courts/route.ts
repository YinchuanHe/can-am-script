import { NextResponse } from 'next/server';

const BASE_URL = 'https://queuesystem-be.onrender.com/api';
const ADMIN_PASSWORD = 'canamadmin';
const REFERER = 'https://can-am.vercel.app/';

const DEFAULT_HEADERS = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
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

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/courts/all`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courts: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }

    // Filter to show only visible and available courts, then transform
    const filteredCourts = data.courts
      .filter((court: {
        _id: string;
        name: string;
        courtNumber: number;
        isVisible: boolean;
        isAvailable: boolean;
        waitlistCount: number;
      }) => court.isVisible && court.isAvailable)
      .map((court: {
        _id: string;
        name: string;
        courtNumber: number;
        isVisible: boolean;
        isAvailable: boolean;
        waitlistCount: number;
      }) => ({
        id: court._id,
        name: court.name,
        courtNumber: court.courtNumber,
        description: court.waitlistCount > 0 
          ? `${court.waitlistCount} in waitlist` 
          : 'Available'
      }));

    return NextResponse.json({
      success: true,
      courts: filteredCourts,
      totalCourts: filteredCourts.length,
      totalAvailableCourts: data.courts.filter((court: any) => court.isVisible && court.isAvailable).length,
      totalAllCourts: data.courts.length
    });

  } catch (error) {
    console.error('Error fetching courts:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch courts',
        success: false
      },
      { status: 500 }
    );
  }
}