import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <i className="ri-leaf-line text-2xl text-emerald-600"></i>
              </div>
              <span className="font-['Pacifico'] text-xl text-emerald-600">AZ Landscapes</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/worker"
                className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Worker Dashboard
              </Link>
              <Link
                to="/supervisor"
                className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Supervisor
              </Link>
              <Link
                to="/client"
                className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Client Portal
              </Link>
              <Link
                to="/admin"
                className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>

          {/* Theme Switcher and Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            {/* Theme Switcher */}
            <button className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-moon-line"></i>
              </div>
            </button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`ri-${isMobileMenuOpen ? 'close' : 'menu'}-line`}></i>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          className="md:hidden flex flex-col space-y-4 p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/worker"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Worker Dashboard
          </Link>
          <Link
            to="/supervisor"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Supervisor
          </Link>
          <Link
            to="/client"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Client Portal
          </Link>
          <Link
            to="/admin"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Admin
          </Link>
        </motion.div>
      )}
    </nav>
  )
}
