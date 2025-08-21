'use client'

import React from 'react'

export default function QueryProviders({ children }: { children: React.ReactNode }) {
  // React Query removed; passthrough wrapper retained for compatibility.
  return <>{children}</>
}