// Clean, simple storage with zero race conditions
import { createClient } from '@/lib/supabase/client'

// Generate consistent user ID for guest or authenticated users
export function getUserId(): string {
  if (typeof window === 'undefined') return 'server'
  
  // Check for guest mode
  const isGuest = localStorage.getItem('guestMode') === 'true' || 
                  document.cookie.includes('guest-mode=true')
  
  if (isGuest) {
    let guestId = localStorage.getItem('guestUserId')
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('guestUserId', guestId)
      document.cookie = `guest-id=${guestId}; path=/; max-age=31536000`
    }
    return guestId
  }
  
  // Authenticated user
  return localStorage.getItem('currentUser') || 'anonymous'
}

// Simple, synchronous storage operations
export function loadData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  
  const userId = getUserId()
  const storageKey = `${userId}_${key}`
  
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.error('[Storage] Load error:', error)
    return defaultValue
  }
}

export function saveData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  
  const userId = getUserId()
  const storageKey = `${userId}_${key}`
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(data))
    console.log(`[Storage] Saved ${storageKey}:`, Array.isArray(data) ? `${data.length} items` : 'data')
  } catch (error) {
    console.error('[Storage] Save error:', error)
  }
}

// Check if user is authenticated (not guest)
export async function isAuthenticatedUser(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const isGuest = localStorage.getItem('guestMode') === 'true' ||
                  document.cookie.includes('guest-mode=true')
  
  if (isGuest) return false
  
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}
