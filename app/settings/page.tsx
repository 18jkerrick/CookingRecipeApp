'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type UnitPreference = 'original' | 'metric' | 'imperial'

export default function Settings() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [unitPreference, setUnitPreference] = useState<UnitPreference>('original')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('unitPreference')
    if (saved && ['original', 'metric', 'imperial'].includes(saved)) {
      setUnitPreference(saved as UnitPreference)
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    // Save preference to localStorage
    localStorage.setItem('unitPreference', unitPreference)
    
    // Show success message
    setTimeout(() => {
      setIsSaving(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }, 500)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#14151a] text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Unit Preference Section */}
        <div className="bg-[#1e1f26] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Measurement Units</h2>
          <p className="text-white/60 text-sm mb-6">
            Choose how ingredient measurements should be displayed throughout the app
          </p>

          <div className="space-y-3">
            <label className="flex items-center p-4 bg-[#14151a] rounded-lg cursor-pointer hover:bg-[#14151a]/80 transition-colors">
              <input
                type="radio"
                name="unitPreference"
                value="original"
                checked={unitPreference === 'original'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="w-5 h-5 text-[#FF3A25] focus:ring-[#FF3A25] focus:ring-offset-0 bg-transparent border-white/30"
              />
              <div className="ml-4">
                <div className="font-medium">Original Units</div>
                <div className="text-sm text-white/60">Display measurements as found in the recipe</div>
              </div>
            </label>

            <label className="flex items-center p-4 bg-[#14151a] rounded-lg cursor-pointer hover:bg-[#14151a]/80 transition-colors">
              <input
                type="radio"
                name="unitPreference"
                value="metric"
                checked={unitPreference === 'metric'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="w-5 h-5 text-[#FF3A25] focus:ring-[#FF3A25] focus:ring-offset-0 bg-transparent border-white/30"
              />
              <div className="ml-4">
                <div className="font-medium">Metric</div>
                <div className="text-sm text-white/60">Convert to grams, milliliters, etc.</div>
              </div>
            </label>

            <label className="flex items-center p-4 bg-[#14151a] rounded-lg cursor-pointer hover:bg-[#14151a]/80 transition-colors">
              <input
                type="radio"
                name="unitPreference"
                value="imperial"
                checked={unitPreference === 'imperial'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="w-5 h-5 text-[#FF3A25] focus:ring-[#FF3A25] focus:ring-offset-0 bg-transparent border-white/30"
              />
              <div className="ml-4">
                <div className="font-medium">Imperial</div>
                <div className="text-sm text-white/60">Convert to cups, ounces, pounds, etc.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 disabled:bg-[#FF3A25]/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  )
}