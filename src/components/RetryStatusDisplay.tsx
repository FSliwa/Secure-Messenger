import { ArrowClockwise, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { RetryAttempt } from '@/lib/auth-retry'
import { formatDistanceToNow } from 'date-fns'

interface RetryStatusDisplayProps {
  attempts: RetryAttempt[]
  isRetrying: boolean
  currentOperation?: string
  className?: string
}

export function RetryStatusDisplay({ 
  attempts, 
  isRetrying, 
  currentOperation = 'Operation',
  className = '' 
}: RetryStatusDisplayProps) {
  if (attempts.length === 0 && !isRetrying) {
    return null
  }

  const lastAttempt = attempts[attempts.length - 1]
  const totalAttempts = attempts.length

  return (
    <div className={`p-3 rounded-lg border bg-muted/50 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">
          {isRetrying ? (
            <ArrowClockwise className="h-4 w-4 animate-spin text-primary" />
          ) : totalAttempts > 0 ? (
            <Warning className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle className="h-4 w-4 text-success" />
          )}
        </div>

        {/* Status Content */}
        <div className="flex-1 min-w-0">
          {/* Main Status */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              {isRetrying ? `Retrying ${currentOperation}...` : `${currentOperation} Status`}
            </h4>
            {totalAttempts > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Current Status Description */}
          <p className="text-xs text-muted-foreground mt-1">
            {isRetrying ? (
              'Attempting to reconnect...'
            ) : totalAttempts > 0 ? (
              `Last attempt failed: ${lastAttempt?.error.message || 'Unknown error'}`
            ) : (
              'Ready'
            )}
          </p>

          {/* Attempt Timeline */}
          {attempts.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Recent attempts:
              </div>
              <div className="space-y-1 max-h-16 overflow-y-auto">
                {attempts.slice(-3).map((attempt, index) => (
                  <div 
                    key={`${attempt.timestamp}-${index}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                      <span className="text-muted-foreground truncate">
                        Attempt {attempt.attempt}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(attempt.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Retry Info */}
          {isRetrying && lastAttempt?.delay && (
            <div className="mt-2 flex items-center gap-2 text-xs text-primary">
              <ArrowClockwise className="h-3 w-3 animate-spin" />
              <span>
                Retrying in {Math.round(lastAttempt.delay / 1000)}s...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SimpleRetryIndicatorProps {
  isRetrying: boolean
  retryCount: number
  operation?: string
  error?: string
  className?: string
}

export function SimpleRetryIndicator({ 
  isRetrying, 
  retryCount, 
  operation = 'operation',
  error,
  className = '' 
}: SimpleRetryIndicatorProps) {
  if (!isRetrying && retryCount === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isRetrying ? (
        <>
          <ArrowClockwise className="h-4 w-4 animate-spin text-primary" />
          <span className="text-primary font-medium">
            Retrying {operation}...
          </span>
        </>
      ) : retryCount > 0 ? (
        <>
          <Warning className="h-4 w-4 text-warning" />
          <div className="flex-1">
            <span className="text-muted-foreground">
              Failed after {retryCount} attempt{retryCount !== 1 ? 's' : ''}
            </span>
            {error && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {error}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}