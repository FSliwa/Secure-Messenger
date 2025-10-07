import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Warning, 
  Info, 
  CheckCircle,
  XCircle,
  Envelope,
  Globe,
  Database,
  Shield,
  Gear,
  Copy
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TroubleshootingStep {
  title: string
  description: string
  steps: string[]
  code?: string
  urls?: { label: string; url: string }[]
}

export function SupabaseTroubleshootingGuide() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(label)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const environmentSteps: TroubleshootingStep = {
    title: "Environment Variables Configuration",
    description: "Set up your Supabase credentials correctly",
    steps: [
      "Create a .env file in your project root directory",
      "Add your Supabase URL and anon key",
      "Ensure variables start with VITE_ prefix (required for Vite)",
      "Restart your development server after changes"
    ],
    code: `# .env file
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
VITE_REDIRECT_URL=http://localhost:5173`,
    urls: [
      { label: "Supabase Dashboard", url: "https://app.supabase.com" }
    ]
  }

  const authenticationSteps: TroubleshootingStep = {
    title: "Authentication Provider Setup",
    description: "Configure email authentication in Supabase Dashboard",
    steps: [
      "Go to Supabase Dashboard → Your Project → Authentication",
      "Click on 'Providers' in the left sidebar",
      "Ensure 'Email' provider is enabled",
      "Check 'Confirm email' setting based on your requirements",
      "Save configuration changes"
    ],
    urls: [
      { label: "Authentication Settings", url: "https://app.supabase.com/project/_/auth/providers" }
    ]
  }

  const redirectUrlSteps: TroubleshootingStep = {
    title: "Redirect URLs Configuration",
    description: "Set up proper redirect URLs for authentication",
    steps: [
      "Go to Authentication → URL Configuration",
      "Set Site URL to your app URL (e.g., http://localhost:5173)",
      "Add all required redirect URLs",
      "Include wildcard URLs for development",
      "Add production URLs when deploying"
    ],
    code: `# Development URLs to add:
http://localhost:5173/**
http://localhost:5173/reset-password
http://localhost:5173/auth/callback
http://localhost:5173/dashboard

# Production URLs (replace with your domain):
https://your-domain.com/**
https://your-domain.com/reset-password
https://your-domain.com/auth/callback
https://your-domain.com/dashboard`,
    urls: [
      { label: "URL Configuration", url: "https://app.supabase.com/project/_/auth/url-configuration" }
    ]
  }

  const emailTemplateSteps: TroubleshootingStep = {
    title: "Email Templates Configuration",
    description: "Verify email templates are properly configured",
    steps: [
      "Go to Authentication → Email Templates",
      "Check 'Confirm signup' template",
      "Ensure it contains {{ .ConfirmationURL }}",
      "Check 'Reset password' template",
      "Verify it contains {{ .ConfirmationURL }}",
      "Customize templates if needed"
    ],
    code: `<!-- Example template structure -->
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>`,
    urls: [
      { label: "Email Templates", url: "https://app.supabase.com/project/_/auth/templates" }
    ]
  }

  const debuggingSteps: TroubleshootingStep = {
    title: "Debugging and Logs",
    description: "Check logs and debug authentication issues",
    steps: [
      "Open Supabase Dashboard → Logs → Auth Logs",
      "Look for email sending attempts",
      "Check for rate limiting errors",
      "Monitor error messages",
      "Use browser console for client-side debugging"
    ],
    code: `// Client-side debugging code
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Environment:', import.meta.env.MODE)

// Test password reset
const { error } = await supabase.auth.resetPasswordForEmail('test@example.com')
console.log('Reset password result:', error)`,
    urls: [
      { label: "Auth Logs", url: "https://app.supabase.com/project/_/logs/auth" }
    ]
  }

  const commonIssues = [
    {
      issue: "Emails not being sent",
      icon: <Envelope className="h-5 w-5 text-warning" />,
      causes: [
        "Email provider not enabled in Supabase",
        "Rate limiting (free tier: 3-4 emails/hour)",
        "Invalid redirect URL configuration",
        "Email going to spam folder"
      ],
      solutions: [
        "Check Authentication → Providers → Email is enabled",
        "Wait between email sending attempts",
        "Verify redirect URLs match your configuration",
        "Check spam/junk folder, add noreply@mail.supabase.io to contacts"
      ]
    },
    {
      issue: "Registration/Login failures",
      icon: <Shield className="h-5 w-5 text-destructive" />,
      causes: [
        "Email confirmation required but user hasn't confirmed",
        "Incorrect environment variables",
        "Database connection issues",
        "Missing user profile creation"
      ],
      solutions: [
        "Check if email confirmation is required in settings",
        "Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
        "Test database connection",
        "Ensure user profile is created after registration"
      ]
    },
    {
      issue: "Redirect URL mismatches",
      icon: <Globe className="h-5 w-5 text-info" />,
      causes: [
        "URL in code doesn't match Supabase configuration",
        "Missing wildcard URLs for development",
        "HTTP vs HTTPS protocol mismatch",
        "Port number differences"
      ],
      solutions: [
        "Ensure URLs in code match Supabase settings exactly",
        "Add /** wildcard for development URLs",
        "Match protocol (http/https) consistently",
        "Include correct port numbers"
      ]
    }
  ]

  const quickChecks = [
    {
      check: "Environment variables loaded",
      test: "console.log(import.meta.env.VITE_SUPABASE_URL)",
      expected: "Should show your Supabase URL, not undefined"
    },
    {
      check: "Supabase connection",
      test: "await supabase.from('users').select('*').limit(1)",
      expected: "Should return data or empty array, not connection error"
    },
    {
      check: "Email provider enabled",
      test: "Check Supabase Dashboard → Authentication → Providers",
      expected: "Email provider should be enabled/checked"
    },
    {
      check: "Redirect URLs configured",
      test: "Check Authentication → URL Configuration",
      expected: "Should include your app URLs and reset password URL"
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warning className="h-6 w-6 text-warning" />
            Supabase Authentication Troubleshooting Guide
          </CardTitle>
          <p className="text-muted-foreground">
            Comprehensive guide to diagnose and fix common Supabase authentication issues
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup Steps</TabsTrigger>
          <TabsTrigger value="issues">Common Issues</TabsTrigger>
          <TabsTrigger value="debug">Quick Checks</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid gap-6">
            {[
              environmentSteps,
              authenticationSteps,
              redirectUrlSteps,
              emailTemplateSteps,
              debuggingSteps
            ].map((step, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    {step.title}
                  </CardTitle>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {step.steps.map((stepItem, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{stepItem}</span>
                      </div>
                    ))}
                  </div>

                  {step.code && (
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                        <code>{step.code}</code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(step.code!, step.title)}
                      >
                        <Copy className="h-4 w-4" />
                        {copiedCode === step.title ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  )}

                  {step.urls && (
                    <div className="flex flex-wrap gap-2">
                      {step.urls.map((url, urlIndex) => (
                        <Button
                          key={urlIndex}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {url.label}
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          <div className="grid gap-6">
            {commonIssues.map((issue, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {issue.icon}
                    {issue.issue}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-destructive">Common Causes:</h4>
                    <ul className="space-y-1">
                      {issue.causes.map((cause, causeIndex) => (
                        <li key={causeIndex} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-success">Solutions:</h4>
                    <ul className="space-y-1">
                      {issue.solutions.map((solution, solutionIndex) => (
                        <li key={solutionIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Run these checks in your browser's developer console to quickly diagnose issues.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {quickChecks.map((check, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{check.check}</span>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <code className="text-sm">{check.test}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => copyToClipboard(check.test, `Check ${index + 1}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Expected result:</strong> {check.expected}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Launch Checklist</CardTitle>
              <p className="text-muted-foreground">
                Ensure all these items are completed before deploying your application
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "✅ .env file created with correct Supabase credentials",
                  "✅ Environment variables start with VITE_ prefix",
                  "✅ Email provider enabled in Supabase Dashboard",
                  "✅ Redirect URLs configured for all environments",
                  "✅ Email templates contain {{ .ConfirmationURL }}",
                  "✅ Database tables exist and are accessible",
                  "✅ Authentication flow tested end-to-end",
                  "✅ Password reset functionality tested",
                  "✅ Error handling implemented for edge cases",
                  "✅ Rate limiting considerations documented",
                  "✅ Spam folder instructions provided to users",
                  "✅ Auth logs monitored for errors"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-border" 
                      id={`checklist-${index}`}
                    />
                    <label 
                      htmlFor={`checklist-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-warning/10 border-warning">
            <Warning className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>Remember:</strong> After making any changes to environment variables or Supabase settings, 
              restart your development server and clear your browser cache/cookies to ensure changes take effect.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}