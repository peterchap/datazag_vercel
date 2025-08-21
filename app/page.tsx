'use client'

export const dynamic = 'force-dynamic'; // auth redirect logic requires runtime session

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loading } from '@/components/ui/loading'
import { USER_ROLES } from '@/shared/schema'

export default function HomePage() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user) {
        // Redirect based on user role
        if (user.role === USER_ROLES.BUSINESS_ADMIN || user.role === USER_ROLES.CLIENT_ADMIN) {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }, [isAuthenticated, loading, user, router])
  
  if (loading) {
    return <Loading text="Checking authentication..." className="h-screen" />
  }
  
  return null
}
