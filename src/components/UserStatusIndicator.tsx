import { useState, useEffect } from 'react'
import { userPresence, UserStatus } from '@/lib/user-presence'
import { cn } from '@/lib/utils'

interface UserStatusIndicatorProps {
  userId: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400'
}

const statusLabels = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline'
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

export function UserStatusIndicator({ 
  userId, 
  size = 'md', 
  showLabel = false,
  className 
}: UserStatusIndicatorProps) {
  const [status, setStatus] = useState<UserStatus>('offline')

  useEffect(() => {
    const loadInitialStatus = async () => {
      const userStatus = await userPresence.getUserStatus(userId)
      setStatus(userStatus)
    }

    loadInitialStatus()

    const unsubscribe = userPresence.subscribeToUserStatus(userId, (newStatus) => {
      setStatus(newStatus)
    })

    return unsubscribe
  }, [userId])

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div 
        className={cn(
          'rounded-full',
          sizeClasses[size],
          statusColors[status],
          'ring-2 ring-background'
        )}
        title={statusLabels[status]}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {statusLabels[status]}
        </span>
      )}
    </div>
  )
}
