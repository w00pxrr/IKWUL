import { useState, useEffect, useRef } from 'react'
import './App.css'

interface LocationData {
  latitude: number
  longitude: number
  continent: string
  country: string
  state: string
  county: string
  city: string
  address: string
}

const generateStars = (): Array<{left: string; top: string; animationDelay: string; width: string; height: string}> => {
  const seed = 12345
  const random = (i: number) => {
    const x = Math.sin(seed + i) * 10000
    return x - Math.floor(x)
  }
  return [...Array(200)].map((_, i) => ({
    left: `${random(i) * 100}%`,
    top: `${random(i + 1) * 100}%`,
    animationDelay: `${random(i + 2) * 3}s`,
    width: `${random(i + 3) * 2 + 1}px`,
    height: `${random(i + 4) * 2 + 1}px`
  }))
}

const stars = generateStars()

function App() {
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [revealedSections, setRevealedSections] = useState<Set<number>>(new Set())
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!started) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-section'))
          if (entry.isIntersecting && !revealedSections.has(index)) {
            setRevealedSections((prev) => new Set([...prev, index]))
          }
        })
      },
      { threshold: 0.5 }
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [started, revealedSections])

  const requestLocation = async () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
          )
          const data = await response.json()

          const locationData: LocationData = {
            latitude,
            longitude,
            continent: data.address?.continent || data.address?.country_code?.toUpperCase() === 'US' ? 'North America' : getContinent(latitude),
            country: data.address?.country || 'Unknown',
            state: data.address?.state || data.address?.county || 'Unknown',
            county: data.address?.county || 'Unknown',
            city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
            address: data.address?.road
              ? `${data.address.house_number || ''} ${data.address.road}`.trim()
              : 'Unknown'
          }

          setLocation(locationData)
          setLoading(false)
        } catch {
          setError('Failed to fetch location data')
          setLoading(false)
        }
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }

  const getContinent = (lat: number): string => {
    if (lat > 0) {
      if (lat >= 71) return 'North America (Arctic)'
      if (lat >= 23.5) return 'North America'
      if (lat >= 0) return 'Africa'
      return 'Europe/Asia'
    }
    if (lat >= -23.5) return 'South America'
    return 'Antarctica'
  }

  const sections = [
    { icon: '🌌', title: 'Galaxy', value: 'Milky Way' },
    { icon: '☀️', title: 'Solar System', value: 'Sol (Local Group)' },
    { icon: '🌍', title: 'Planet', value: 'Earth' },
    { icon: '🗺️', title: 'Continent', value: location?.continent || '—' },
    { icon: '🇺🇸', title: 'Country', value: location?.country || '—' },
    { icon: '🏛️', title: 'State/Province', value: location?.state || '—' },
    { icon: '📍', title: 'County', value: location?.county || '—' },
    { icon: '🏙️', title: 'City', value: location?.city || '—' },
    { icon: '🏠', title: 'Address', value: location?.address || '—' },
    {
      icon: '📌',
      title: 'Coordinates',
      value: location
        ? `${location.latitude.toFixed(6)}° N, ${location.longitude.toFixed(6)}° W`
        : '—'
    }
  ]

  return (
    <div className="app">
      <div className="starfield">
        {stars.map((star, i) => (
          <div key={i} className="star" style={star} />
        ))}
      </div>

      <div className="scanlines" />

      <header className="header">
        <h1 className="title">IKWUL</h1>
        <p className="tagline">I Know Where You Live</p>
      </header>

      {!started ? (
        <div className="start-screen">
          <button
            className="reveal-btn"
            onClick={() => {
              setStarted(true)
              requestLocation()
            }}
            disabled={loading}
          >
            {loading ? 'Locating you...' : '▶ REVEAL MY LOCATION'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="sections">
          {sections.map((section, index) => (
            <div
              key={index}
              ref={(el) => { sectionRefs.current[index] = el }}
              data-section={index}
              className={`section ${revealedSections.has(index) ? 'revealed' : ''}`}
            >
              <span className="section-icon">{section.icon}</span>
              <h2 className="section-title">{section.title}</h2>
              <p className="section-value">{section.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="scroll-indicator">
        <span>↓</span>
      </div>
    </div>
  )
}

export default App