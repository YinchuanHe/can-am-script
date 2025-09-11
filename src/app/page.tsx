'use client';

import { useState, useEffect } from 'react';

interface Court {
  id: string;
  name: string;
  courtNumber: number;
  description: string;
}

interface AutomationStatus {
  active: boolean;
  sessionId?: string;
  courtId?: string;
  currentGroup?: number;
  nextRotationTime?: string;
  minutesToNextRotation?: number;
  reservationStatus?: {
    currentGroup: { animalName: string }[];
    waitlistGroup1: { animalName: string }[];
    waitlistGroup2: { animalName: string }[];
    timeRemaining: string;
  };
  userGroups?: {
    group0: string[];
    group1: string[];
    group2: string[];
  };
}

export default function Home() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [duration, setDuration] = useState(2);
  const [status, setStatus] = useState<{ type: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({ active: false });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCourts();
    checkAutomationStatus();
  }, []);

  const loadCourts = async () => {
    try {
      const response = await fetch('/api/list-courts');
      const data = await response.json();
      if (data.success) {
        setCourts(data.courts);
        if (data.courts.length > 0 && !selectedCourt) {
          setSelectedCourt(data.courts[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading courts:', error);
    }
  };

  const checkAutomationStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setAutomationStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const startAutomation = async () => {
    if (!selectedCourt) {
      setStatus({ type: 'error', message: 'Please select a court' });
      return;
    }

    setStatus({ type: 'loading', message: 'Starting automation...' });

    try {
      const response = await fetch('/api/start-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          courtId: selectedCourt, 
          durationHours: duration 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start automation');
      }

      setStatus({ type: 'success', message: `✅ Automation started for ${duration} hours!` });
      checkAutomationStatus();
      
      // Start polling for status updates
      const interval = setInterval(checkAutomationStatus, 30000); // Every 30 seconds
      setRefreshInterval(interval);
      
      setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      console.error('Error:', error);
      setStatus({ 
        type: 'error', 
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      
      setTimeout(() => setStatus(null), 10000);
    }
  };

  const stopAutomation = async () => {
    setStatus({ type: 'loading', message: 'Stopping automation...' });

    try {
      const response = await fetch('/api/stop-automation', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setStatus({ type: 'success', message: '✅ Automation stopped!' });
        setAutomationStatus({ active: false });
        
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      } else {
        throw new Error(result.message || 'Failed to stop automation');
      }
      
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setStatus({ 
        type: 'error', 
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      
      setTimeout(() => setStatus(null), 5000);
    }
  };

  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
          🏸 Court Reservation Automation
        </h1>
        
        {!automationStatus.active ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Court
              </label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} - {court.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={startAutomation}
              disabled={!selectedCourt || status?.type === 'loading'}
              className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              Start Automation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">🟢 Automation Active</h3>
              <p className="text-sm text-green-700">
                Session: {automationStatus.sessionId}
              </p>
              {automationStatus.reservationStatus && (
                <p className="text-sm text-green-700">
                  Time remaining: {automationStatus.reservationStatus.timeRemaining}
                </p>
              )}
            </div>

            {automationStatus.userGroups && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Current Status:</h4>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-blue-800">🏸 On Court (Group {automationStatus.currentGroup})</p>
                  <p className="text-sm text-blue-700">
                    {automationStatus.userGroups[`group${automationStatus.currentGroup}` as keyof typeof automationStatus.userGroups]?.join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2].filter(i => i !== automationStatus.currentGroup).map((groupNum) => (
                    <div key={groupNum} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="font-medium text-yellow-800">⏳ Waitlist (Group {groupNum})</p>
                      <p className="text-sm text-yellow-700">
                        {automationStatus.userGroups?.[`group${groupNum}` as keyof typeof automationStatus.userGroups]?.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>

                {automationStatus.minutesToNextRotation !== undefined && (
                  <div className="text-center text-sm text-gray-600">
                    Next rotation in: {automationStatus.minutesToNextRotation} minutes
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={checkAutomationStatus}
                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                Refresh Status
              </button>
              
              <button
                onClick={stopAutomation}
                disabled={status?.type === 'loading'}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                Stop Automation
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`mt-6 p-4 rounded-lg text-center ${
            status.type === 'loading' ? 'bg-blue-50 text-blue-800' :
            status.type === 'success' ? 'bg-green-50 text-green-800' :
            'bg-red-50 text-red-800'
          }`}>
            {status.type === 'loading' && (
              <div className="inline-block w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full animate-spin mr-2"></div>
            )}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
