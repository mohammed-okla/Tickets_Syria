import React from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const { t } = useLanguage()
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={`animate-spin ${sizeClasses[size]} text-primary`} />
        <p className="text-sm text-muted-foreground">
          {text || t('common.loading')}
        </p>
      </div>
    </div>
  )
}