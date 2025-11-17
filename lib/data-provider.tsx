"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface DataProviderContextType {
  user: User | null
  isGuest: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

const DataProviderContext = createContext<DataProviderContextType>({
  user: null,
  isGuest: false,
  isLoading: true,
  signOut: async () => {},
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Check if user is in guest mode
    const guestMode = localStorage.getItem('guestMode')
    if (guestMode === 'true') {
      setIsGuest(true)
      setIsLoading(false)
      return
    }

    // Check for authenticated user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (isGuest) {
      // Clear guest mode
      localStorage.removeItem('guestMode')
      window.location.href = '/'
    } else {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/'
    }
  }

  return (
    <DataProviderContext.Provider value={{ user, isGuest, isLoading, signOut }}>
      {children}
    </DataProviderContext.Provider>
  )
}

export function useDataProvider() {
  return useContext(DataProviderContext)
}

// Helper hooks for data operations
export function useSupabaseOrLocal() {
  const { user, isGuest } = useDataProvider()
  
  return {
    isAuthenticated: !isGuest && !!user,
    isGuest,
    userId: user?.id,
  }
}
