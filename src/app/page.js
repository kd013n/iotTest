'use client'

import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">h</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">homnii</h1>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
          <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Smart Living,
            <br />
            Simplified
          </h2>
          <p className="text-xl md:text-2xl max-w-2xl mb-12 text-gray-600 dark:text-gray-300 leading-relaxed">
            homnii is your intelligent companion for solo living. Control lighting, climate, security, and more with elegant simplicity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🏠 Enter Dashboard
            </Link>
            <Link
              href="/rooms/living-room"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🛋️ Explore Rooms
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Smart Lighting</h3>
              <p className="text-gray-600 dark:text-gray-300">Adaptive lighting that responds to your presence and preferences</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🌡️</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Climate Control</h3>
              <p className="text-gray-600 dark:text-gray-300">Automatic temperature management for optimal comfort</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Security</h3>
              <p className="text-gray-600 dark:text-gray-300">Comprehensive protection with smart access control</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} homnii. Designed for solo living.</p>
      </footer>
    </div>
  );
}
