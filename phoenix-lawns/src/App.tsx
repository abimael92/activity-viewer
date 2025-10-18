import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { LandingPage } from './pages/LandingPage'

function App() {
  return (
    <Router>
      {/* Always render the Navbar at the top */}
      <Navbar />

      <main>
        {/* Define the routes for your pages */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* You can add more routes here as you build other pages */}
        </Routes>
      </main>

      {/* Always render the Footer at the bottom */}
      <Footer />
    </Router>
  )
}

export default App
