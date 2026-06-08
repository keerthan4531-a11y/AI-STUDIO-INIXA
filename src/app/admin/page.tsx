'use client';

import React, { useState, useEffect } from 'react';
import TokenGraph from '@/components/TokenGraph';

interface AdminStats {
  totalRequests: number;
  totalTokens: number;
  failedRequests: number;
  activeUsersCount: number;
  tokenHistory: any[];
  bannedIps: string[];
  rateLimitConfig: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [newBanIp, setNewBanIp] = useState('');
  const [newRateLimit, setNewRateLimit] = useState('');

  // Fetch stats loop when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin', {
          headers: { 'Authorization': `Bearer ${password}` }
        });
        const data = await res.json();
        if (data.ok) {
          setStats(data.stats);
        } else {
          setIsAuthenticated(false);
          setError('Session expired or unauthorized');
        }
      } catch (err) {
        console.error('Failed to fetch admin stats', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [isAuthenticated, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      const data = await res.json();
      if (data.ok) {
        setIsAuthenticated(true);
        setStats(data.stats);
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Connection failed');
    }
  };

  const handleAction = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Admin action failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col font-sans">
      {!isAuthenticated ? (
        // Login Screen
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-500/10 p-3 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Restricted Area</h2>
            <p className="text-gray-400 text-center mb-6">Enter admin password to access the dashboard</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors">
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Dashboard
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <span className="bg-red-500 w-3 h-3 rounded-full animate-pulse"></span>
                  Inixa Control Center
                </h1>
                <p className="text-gray-400 mt-1">Live metrics and security controls</p>
              </div>
              <button onClick={() => window.close()} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                Close Tab
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Active Users (5m)</p>
                <p className="text-3xl font-bold text-white">{stats?.activeUsersCount || 0}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Total API Requests</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.totalRequests || 0}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Tokens Generated</p>
                <p className="text-3xl font-bold text-violet-400">{stats?.totalTokens || 0}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Failed Requests</p>
                <p className="text-3xl font-bold text-red-400">{stats?.failedRequests || 0}</p>
              </div>
            </div>

            {/* Token Graph */}
            <div className="w-full">
              <TokenGraph data={stats?.tokenHistory || []} />
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Controls */}
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Security Controls</h3>
                
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Global Rate Limit (Req/min)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={newRateLimit} 
                      onChange={(e) => setNewRateLimit(e.target.value)}
                      placeholder={stats?.rateLimitConfig?.toString() || "20"} 
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 flex-1"
                    />
                    <button 
                      onClick={() => handleAction('set_rate_limit', { limit: parseInt(newRateLimit) })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">Ban IP Address</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newBanIp} 
                      onChange={(e) => setNewBanIp(e.target.value)}
                      placeholder="e.g. 192.168.1.1" 
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 flex-1"
                    />
                    <button 
                      onClick={() => { handleAction('ban_ip', { ip: newBanIp }); setNewBanIp(''); }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              </div>

              {/* Banned IPs List */}
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2 mb-4">Banned IP List</h3>
                {stats?.bannedIps?.length === 0 ? (
                  <p className="text-gray-500 italic">No IPs currently banned.</p>
                ) : (
                  <div className="space-y-2">
                    {stats?.bannedIps?.map((ip) => (
                      <div key={ip} className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-lg">
                        <span className="text-red-400 font-mono text-sm">{ip}</span>
                        <button 
                          onClick={() => handleAction('unban_ip', { ip })}
                          className="text-gray-400 hover:text-white text-xs bg-gray-700 px-2 py-1 rounded"
                        >
                          Unban
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
