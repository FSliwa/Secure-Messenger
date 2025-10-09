import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WarningCircle, CheckCircle, XCircle, Info } from '@phosphor-icons/react'
import { checkBrowserCompatibility } from '@/lib/crypto'

export function BrowserCompatibilityCheck() {
  const [compatibilityResult, setCompatibilityResult] = useState<ReturnType<typeof checkBrowserCompatibility> | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const result = checkBrowserCompatibility()
    setCompatibilityResult(result)
    
    // Auto-dismiss if everything is fine
    if (result.compatible && result.warnings.length === 0) {
      setTimeout(() => setDismissed(true), 3000)
    }
  }, [])

  if (!compatibilityResult || dismissed) {
    return null
  }

  // If not compatible, show blocking error
  if (!compatibilityResult.compatible) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" weight="fill" />
              Browser Not Supported
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Browser Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Detected:</strong> {compatibilityResult.browserInfo.name} {compatibilityResult.browserInfo.version}
              </AlertDescription>
            </Alert>

            {/* Issues */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Required Features Not Available:</h4>
              <ul className="space-y-2">
                {compatibilityResult.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" weight="fill" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supported Browsers */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Recommended Browsers:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" weight="fill" />
                  <span>Chrome 90+</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" weight="fill" />
                  <span>Firefox 88+</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" weight="fill" />
                  <span>Safari 14+</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" weight="fill" />
                  <span>Edge 90+</span>
                </div>
              </div>
            </div>

            {/* Feature Details */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
              <div className="space-y-1 text-muted-foreground ml-4">
                <div>WebCrypto API: {compatibilityResult.details.crypto ? '✅' : '❌'}</div>
                <div>localStorage: {compatibilityResult.details.localStorage ? '✅' : '❌'}</div>
                <div>TextEncoder: {compatibilityResult.details.textEncoder ? '✅' : '❌'}</div>
                <div>Promises: {compatibilityResult.details.promises ? '✅' : '❌'}</div>
                <div>Fetch API: {compatibilityResult.details.fetch ? '✅' : '❌'}</div>
                <div>ES6 Support: {compatibilityResult.details.es6 ? '✅' : '❌'}</div>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If compatible but has warnings, show dismissible alert
  if (compatibilityResult.warnings.length > 0) {
    return (
      <div className="fixed top-20 right-4 z-40 max-w-md">
        <Alert className="bg-warning/10 border-warning">
          <WarningCircle className="h-4 w-4 text-warning" weight="fill" />
          <AlertDescription className="flex flex-col gap-2">
            <div>
              <strong>{compatibilityResult.browserInfo.name} {compatibilityResult.browserInfo.version}</strong>
              {' '}detected
            </div>
            <ul className="text-xs space-y-1">
              {compatibilityResult.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissed(true)}
              className="mt-2 w-full"
            >
              Continue Anyway
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // All good - show brief success message that auto-dismisses
  return (
    <div className="fixed top-20 right-4 z-40 max-w-md animate-fade-in">
      <Alert className="bg-success/10 border-success">
        <CheckCircle className="h-4 w-4 text-success" weight="fill" />
        <AlertDescription>
          <strong>{compatibilityResult.browserInfo.name} {compatibilityResult.browserInfo.version}</strong>
          {' '}is fully supported! ✅
        </AlertDescription>
      </Alert>
    </div>
  )
}

