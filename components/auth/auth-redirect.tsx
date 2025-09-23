'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef} from 'react'
import { USER_ROLES } from '@/shared/schema'

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (status === 'loading') return // Still loading

    const isAdminRoute = pathname.startsWith('/admin')
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')

    if (session?.user) {
      if (pathname === '/login') {
        hasRedirected.current = true
        router.push('/dashboard')
        return
      }
      
      if (pathname === '/') {
        hasRedirected.current = true
        const userRole = session.user.role
        const redirectUrl = 
          userRole === USER_ROLES.BUSINESS_ADMIN || userRole === USER_ROLES.CLIENT_ADMIN
            ? '/admin'
            : '/dashboard'
        router.push(redirectUrl)
        return
      }
    }
  }, [session, status, router, pathname])

  // Reset redirect flag when pathname changes
  useEffect(() => {
    hasRedirected.current = false
  }, [pathname])

  return <>{children}</>
}