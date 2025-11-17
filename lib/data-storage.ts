import { createClient } from '@/lib/supabase/client'

// Generate user-specific localStorage keys
export function getUserStorageKey(baseKey: string, userId?: string | null): string {
  if (!userId) {
    // For guest users, use a unique guest ID
    const guestId = getOrCreateGuestId()
    return `guest_${guestId}_${baseKey}`
  }
  return `user_${userId}_${baseKey}`
}

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Check localStorage first
  let guestId = localStorage.getItem('guestUserId')
  
  // Check cookie as backup
  if (!guestId) {
    const cookieMatch = document.cookie.match(/guest-id=([^;]+)/)
    if (cookieMatch) {
      guestId = cookieMatch[1]
      localStorage.setItem('guestUserId', guestId)
    }
  }
  
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`
    localStorage.setItem('guestUserId', guestId)
    // Also set in cookie for backup
    document.cookie = `guest-id=${guestId}; path=/; max-age=31536000; SameSite=Lax`
    console.log('[v0] Created new guest ID:', guestId)
  } else {
    console.log('[v0] Using existing guest ID:', guestId)
  }
  return guestId
}

// Load data from localStorage with user-specific key
export function loadFromLocalStorage<T>(baseKey: string, userId: string | null, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const key = getUserStorageKey(baseKey, userId)
    const item = localStorage.getItem(key)
    console.log('[v0] Loading from localStorage:', key, 'Found:', !!item)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error loading from localStorage (${baseKey}):`, error)
    return defaultValue
  }
}

// Save data to localStorage with user-specific key
export function saveToLocalStorage<T>(baseKey: string, data: T, userId: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getUserStorageKey(baseKey, userId)
    localStorage.setItem(key, JSON.stringify(data))
    console.log('[v0] Saved to localStorage:', key, 'Data length:', Array.isArray(data) ? data.length : 'N/A')
  } catch (error) {
    console.error(`Error saving to localStorage (${baseKey}):`, error)
  }
}

// Check if user is authenticated
export async function isUserAuthenticated(): Promise<{ user: any; isGuest: boolean }> {
  if (typeof window === 'undefined') return { user: null, isGuest: false };
  
  const guestMode = localStorage.getItem('guestMode')
  if (guestMode === 'true') {
    return { user: null, isGuest: true }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, isGuest: false }
}

// Get current user ID (works for both authenticated and guest)
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const guestMode = localStorage.getItem('guestMode')
  const guestModeFromCookie = document.cookie.includes('guest-mode=true')
  
  if (guestMode === 'true' || guestModeFromCookie) {
    const id = getOrCreateGuestId()
    console.log('[v0] getCurrentUserId returning guest ID:', id)
    return id
  }
  
  // For authenticated users, get from current user
  const userId = localStorage.getItem('currentUser')
  console.log('[v0] getCurrentUserId returning user ID:', userId)
  return userId
}
