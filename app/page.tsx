"use client";

import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLastVisitedPage } from '../hooks/useNavigationPersistence'

export default function Home() {
  const { signInWithGoogle, signInWithApple, user, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Redirect authenticated users to their last visited page
    if (user && !loading) {
      const lastPage = getLastVisitedPage()
      console.log('🏠 Redirecting to last visited page:', lastPage)
      router.push(lastPage)
    }
  }, [user, loading, router])

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Welcome!</h1>
          <p className="text-gray-400">Redirecting to your cookbooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
      <div className="max-w-lg w-full space-y-12 p-8">
        <div className="text-center">
          <h1 className="text-8xl font-bold mb-4">🍳</h1>
          <h2 className="text-7xl font-serif italic text-white mb-12">Remy</h2>
        </div>
        
        <div className="space-y-6">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center px-8 py-5 border border-white/20 rounded-xl text-lg font-medium text-white bg-white/10 hover:bg-[#8F89FA]/80 transition-all transform hover:scale-105"
          >
            <span className="text-2xl mr-4">G</span>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}
