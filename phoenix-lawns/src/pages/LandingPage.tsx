import { motion } from 'framer-motion'
import { ServiceCard } from '../components/ServiceCard'
import { Testimonials } from '../components/Testimonials'

export const LandingPage = () => {
  return (
    <div>
      {/* Hero Section */}
      <motion.section
        className="bg-primary text-white py-16 px-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-4xl font-bold mb-4">Welcome to PhoenixLawns</h1>
        <p className="text-lg mb-8">Your trusted partner for all lawn care needs.</p>
        <button className="bg-accent-orange text-white py-2 px-6 rounded-full text-lg hover:bg-accent-yellow transition">
          Get Started
        </button>
      </motion.section>

      {/* Services Section */}
      <section className="py-16 px-6 bg-sand">
        <h2 className="text-3xl font-semibold text-center mb-10">Our Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ServiceCard title="Lawn Mowing" description="Efficient mowing service for a clean yard." />
          <ServiceCard title="Weeding" description="Targeted weeding to keep your lawn healthy." />
          <ServiceCard title="Fertilization" description="Fertilizer application to nourish your lawn." />
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Footer */}
      <footer className="bg-primary text-white py-4 text-center">
        <p>&copy; 2025 PhoenixLawns. All rights reserved.</p>
      </footer>
    </div>
  )
}
