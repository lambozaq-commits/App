"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'

export default function GuestPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Cookie is for middleware, localStorage is for client components
    document.cookie = "guest-mode=true; path=/; max-age=86400" // 1 day
    localStorage.setItem("guestMode", "true")
    
    // Set guest session start time for expiration tracking
    if (!localStorage.getItem('guestSessionStart')) {
      localStorage.setItem('guestSessionStart', Date.now().toString())
    }
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="text-2xl font-semibold mb-3">Starting Guest Mode...</div>
        <p className="text-muted-foreground mb-4">Your data will be stored locally on this device</p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            Important: Guest data expires in 1 day
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Your data is only saved on this device</li>
            <li>• All data will be automatically deleted after 1 day</li>
            <li>• Create an account to save your data permanently</li>
          </ul>
        </div>
        <div className="mt-6 text-sm text-muted-foreground">
          Redirecting in {countdown}...
        </div>
      </div>
    </div>
  )
}
