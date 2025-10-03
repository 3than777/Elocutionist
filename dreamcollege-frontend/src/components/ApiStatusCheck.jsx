import React, { useState } from 'react';
import { API_BASE_URL } from '../services/api';

export default function ApiStatusCheck() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkApiStatus = async () => {
    setLoading(true);
    try {
      // Check basic health endpoint
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      const healthData = await healthResponse.json();
      
      // Check OpenAI status endpoint
      const openaiResponse = await fetch(`${API_BASE_URL}/api/openai-status`);
      const openaiData = await openaiResponse.json();
      
      setStatus({
        health: healthData,
        openai: openaiData,
        apiUrl: API_BASE_URL
      });
    } catch (error) {
      setStatus({
        error: error.message,
        apiUrl: API_BASE_URL
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: '#222', 
      padding: 15, 
      borderRadius: 8,
      color: '#fff',
      fontSize: 12,
      maxWidth: 300,
      zIndex: 1000
    }}>
      <h4>API Status</h4>
      <button onClick={checkApiStatus} disabled={loading}>
        {loading ? 'Checking...' : 'Check Status'}
      </button>
      
      {status && (
        <div style={{ marginTop: 10 }}>
          <div>API URL: {status.apiUrl}</div>
          {status.error ? (
            <div style={{ color: '#ff6666' }}>Error: {status.error}</div>
          ) : (
            <>
              <div style={{ color: status.health?.status === 'healthy' ? '#66ff66' : '#ff6666' }}>
                Health: {status.health?.status || 'unknown'}
              </div>
              <div style={{ color: status.openai?.apiKeyConfigured ? '#66ff66' : '#ff6666' }}>
                OpenAI Key: {status.openai?.apiKeyConfigured ? 'Configured' : 'Not Set'}
              </div>
              <div style={{ color: status.openai?.openaiStatus === 'connected' ? '#66ff66' : '#ff6666' }}>
                OpenAI Status: {status.openai?.openaiStatus || 'unknown'}
              </div>
              {status.openai?.error && (
                <div style={{ color: '#ff6666', fontSize: 10 }}>
                  Error: {status.openai.error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}