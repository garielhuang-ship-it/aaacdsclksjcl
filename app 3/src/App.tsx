import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import ReadingPractice from './pages/ReadingPractice'
import SpeakingPractice from './pages/SpeakingPractice'
import FullSimulation from './pages/FullSimulation'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/reading" element={<ReadingPractice />} />
      <Route path="/speaking" element={<SpeakingPractice />} />
      <Route path="/full-simulation" element={<FullSimulation />} />
    </Routes>
  )
}
