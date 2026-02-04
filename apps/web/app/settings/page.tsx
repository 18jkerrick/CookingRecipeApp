'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'
import { Navigation } from '../../components/shared/Navigation'
import { Button } from '../../components/ui/button'

type UnitPreference = 'original' | 'metric' | 'imperial'

export default function Settings() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [unitPreference, setUnitPreference] = useState<UnitPreference>('original')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Save this page as the last visited
  useNavigationPersistence()

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
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-wk-bg-primary">
      <Navigation currentPath="/settings" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-display text-wk-text-primary font-display mb-8">
          Settings
        </h1>

        {/* Unit Preference Section */}
        <section className="bg-wk-bg-surface rounded-xl p-6 shadow-wk mb-6">
          <h2 className="text-h3 text-wk-text-primary font-display mb-2">
            Measurement Units
          </h2>
          <p className="text-wk-text-secondary font-body text-sm mb-6">
            Choose how ingredient measurements should be displayed throughout the app
          </p>

          <div className="space-y-3">
            {/* Original Units Option */}
            <label 
              className={`
                flex items-center p-4 rounded-lg cursor-pointer transition-colors duration-200
                ${unitPreference === 'original' 
                  ? 'bg-wk-accent text-wk-text-primary' 
                  : 'bg-wk-bg-surface-hover text-wk-text-secondary hover:bg-wk-bg-surface-hover/80'
                }
              `}
            >
              <input
                type="radio"
                name="unitPreference"
                value="original"
                checked={unitPreference === 'original'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="sr-only"
              />
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-colors
                ${unitPreference === 'original' 
                  ? 'border-wk-text-primary' 
                  : 'border-wk-text-secondary'
                }
              `}>
                {unitPreference === 'original' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-wk-text-primary" />
                )}
              </div>
              <div>
                <div className={`font-medium font-body ${unitPreference === 'original' ? 'text-wk-text-primary' : 'text-wk-text-primary'}`}>
                  Original Units
                </div>
                <div className={`text-sm font-body ${unitPreference === 'original' ? 'text-wk-text-primary/80' : 'text-wk-text-secondary'}`}>
                  Display measurements as found in the recipe
                </div>
              </div>
            </label>

            {/* Metric Option */}
            <label 
              className={`
                flex items-center p-4 rounded-lg cursor-pointer transition-colors duration-200
                ${unitPreference === 'metric' 
                  ? 'bg-wk-accent text-wk-text-primary' 
                  : 'bg-wk-bg-surface-hover text-wk-text-secondary hover:bg-wk-bg-surface-hover/80'
                }
              `}
            >
              <input
                type="radio"
                name="unitPreference"
                value="metric"
                checked={unitPreference === 'metric'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="sr-only"
              />
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-colors
                ${unitPreference === 'metric' 
                  ? 'border-wk-text-primary' 
                  : 'border-wk-text-secondary'
                }
              `}>
                {unitPreference === 'metric' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-wk-text-primary" />
                )}
              </div>
              <div>
                <div className={`font-medium font-body ${unitPreference === 'metric' ? 'text-wk-text-primary' : 'text-wk-text-primary'}`}>
                  Metric
                </div>
                <div className={`text-sm font-body ${unitPreference === 'metric' ? 'text-wk-text-primary/80' : 'text-wk-text-secondary'}`}>
                  Convert to grams, milliliters, etc.
                </div>
              </div>
            </label>

            {/* Imperial Option */}
            <label 
              className={`
                flex items-center p-4 rounded-lg cursor-pointer transition-colors duration-200
                ${unitPreference === 'imperial' 
                  ? 'bg-wk-accent text-wk-text-primary' 
                  : 'bg-wk-bg-surface-hover text-wk-text-secondary hover:bg-wk-bg-surface-hover/80'
                }
              `}
            >
              <input
                type="radio"
                name="unitPreference"
                value="imperial"
                checked={unitPreference === 'imperial'}
                onChange={(e) => setUnitPreference(e.target.value as UnitPreference)}
                className="sr-only"
              />
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-colors
                ${unitPreference === 'imperial' 
                  ? 'border-wk-text-primary' 
                  : 'border-wk-text-secondary'
                }
              `}>
                {unitPreference === 'imperial' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-wk-text-primary" />
                )}
              </div>
              <div>
                <div className={`font-medium font-body ${unitPreference === 'imperial' ? 'text-wk-text-primary' : 'text-wk-text-primary'}`}>
                  Imperial
                </div>
                <div className={`text-sm font-body ${unitPreference === 'imperial' ? 'text-wk-text-primary/80' : 'text-wk-text-secondary'}`}>
                  Convert to cups, ounces, pounds, etc.
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="border border-wk-error/30 bg-wk-error/5 rounded-xl p-6 mb-6">
          <h2 className="text-h3 text-wk-text-primary font-display mb-2">
            Danger Zone
          </h2>
          <p className="text-wk-text-secondary font-body text-sm mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="destructive" size="sm">
            Delete Account
          </Button>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed bottom-6 right-6 bg-wk-success text-wk-text-primary px-6 py-3 rounded-lg shadow-wk font-body">
            Settings saved successfully!
          </div>
        )}
      </main>
    </div>
  )
}
