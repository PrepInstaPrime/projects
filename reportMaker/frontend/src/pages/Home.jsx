import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Reports from '../components/reports/Reports.jsx'
export default function Home() {
  const navigate = useNavigate()
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
    }
  }, [navigate])
  return (
    <>
    {/* <Navbar /> */}
    <Reports />
    </>
  )
}
