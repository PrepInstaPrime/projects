import React, { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'

const baseItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Profile', path: '/profile' },
  { name: 'Reports', path: '/reports' },
]

function navItemsForUser() {
  let user = null
  try {
    const raw = localStorage.getItem('user')
    user = raw ? JSON.parse(raw) : null
  } catch {
    user = null
  }
  if (user?.role === 'admin') {
    return [
      ...baseItems,
      { name: 'Create task', path: '/reports/create' },
    ]
  }
  return baseItems
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const items = navItemsForUser()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Defer state update to avoid sync setState-in-effect lint.
    const t = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(t)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [menuOpen])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 767) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  const navEndMatch = (path) => path === '/' || path === '/reports'

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Home">
          <span className={styles.brandText}>ReportMaker</span>
        </Link>

        <nav
          className={styles.desktopNav}
          aria-label="Main"
        >
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.linkActive : '']
                  .filter(Boolean)
                  .join(' ')
              }
              end={navEndMatch(item.path)}
            >
              {item.name}
            </NavLink>
          ))}
          <button
            type="button"
            className={`${styles.link} ${styles.linkLogout} ${styles.logoutBtn}`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={styles.srOnly}>
            {menuOpen ? 'Close menu' : 'Open menu'}
          </span>
          <span className={styles.hamburger} aria-hidden>
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBar} />
          </span>
        </button>
      </div>

      <div
        className={`${styles.backdrop} ${menuOpen ? styles.backdropOpen : ''}`}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />

      <div
        id="main-menu"
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
        aria-label="Main navigation"
      >
        <nav className={styles.mobileLinks}>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [styles.linkMobile, isActive ? styles.linkMobileActive : '']
                  .filter(Boolean)
                  .join(' ')
              }
              end={navEndMatch(item.path)}
              onClick={() => setMenuOpen(false)}
            >
              {item.name}
            </NavLink>
          ))}
          <button
            type="button"
            className={`${styles.linkMobile} ${styles.linkMobileLogout}`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  )
}
