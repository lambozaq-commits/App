"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  const handleGuestMode = () => {
    document.cookie = "guest-mode=true; path=/; max-age=31536000" // 1 year
    localStorage.setItem("guestMode", "true")
    router.push("/guest")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ProductivityHub
          </CardTitle>
          <CardDescription className="text-base">
            Your all-in-one productivity companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full" size="lg">
                Log In
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="w-full">
              <Button className="w-full" variant="outline" size="lg">
                Sign Up
              </Button>
            </Link>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button 
            onClick={handleGuestMode}
            className="w-full" 
            variant="secondary" 
            size="lg"
          >
            Try as Guest
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Guest mode stores data locally. Create an account to sync across devices.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
