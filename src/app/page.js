export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center shadow-md bg-gray-950/30 backdrop-blur-md">
        <h1 className="text-2xl font-bold">SmartHome</h1>
        <nav className="space-x-6">
          <a href="#features" className="hover:text-cyan-400">Features</a>
          <a href="#about" className="hover:text-cyan-400">About</a>
          <a href="#contact" className="hover:text-cyan-400">Contact</a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-6">
        <h2 className="text-4xl md:text-6xl font-extrabold mb-4">
          Control Your Home, Intelligently
        </h2>
        <p className="text-lg md:text-xl max-w-xl mb-8 text-gray-300">
          Monitor and control lights, climate, and security from anywhere — effortlessly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-lg font-semibold shadow-lg transition"
          >
            📊 Dashboard
          </a>
          <a
            href="/lighting"
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-lg font-semibold shadow-lg transition"
          >
            🌈 Lighting Control
          </a>
          <a
            href="/fan-control"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-lg font-semibold shadow-lg transition"
          >
            🌀 Fan Control
          </a>
          <a
            href="/rain-control"
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-lg font-semibold shadow-lg transition"
          >
            🌧️ Rain Control
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} SmartHome. All rights reserved.
      </footer>
    </div>
  );
}
