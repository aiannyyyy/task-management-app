import React, { useEffect, useState } from 'react';
import { workspaceService } from '../services/api';
import { authService } from '../services/authService';

interface AcceptInviteProps {
  onGoToDashboard: () => void;
  onGoToLogin: () => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ onGoToDashboard, onGoToLogin }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login_required'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No invite token found in the URL.');
      return;
    }

    const user = authService.getCurrentUser();
    if (!user) {
      setStatus('login_required');
      setMessage('Please log in first to accept this invitation.');
      return;
    }

    workspaceService.acceptInvite(token)
      .then(result => {
        setWorkspaceName(result.workspace.name);
        setStatus('success');
        setMessage(result.message);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message ?? 'Failed to accept invitation.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Accepting invite...</h2>
            <p className="text-gray-500 dark:text-gray-400">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to the team!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">You've joined <strong>{workspaceName}</strong>.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>
            <button
              onClick={onGoToDashboard}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invite failed</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <button
              onClick={onGoToDashboard}
              className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'login_required' && (
          <>
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Login required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <button
              onClick={onGoToLogin}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Log In / Register
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;