import React from 'react';
import { authService } from '../services/authService';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, onLogout }) => {
  const user = authService.getCurrentUser();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📋 Task Manager
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-gray-700 dark:text-gray-300">
                Hello, <span className="font-semibold">{user.name}</span>
              </span>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;