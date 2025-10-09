import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function RLSDiagnosticPanel() {
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestingRLS, setIsTestingRLS] = useState(false)

  const testRLSPolicies = async () => {
    setIsTestingRLS(true)
    const results: any = {}

    try {
      // Test 1: Can read users?
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      results.users = {
        canRead: !usersError,
        error: usersError?.message
      }

      // Test 2: Can read conversations?
      const { data: convsData, error: convsError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1)
      
      results.conversations = {
        canRead: !convsError,
        error: convsError?.message
      }

      // Test 3: Can read participants?
      const { data: partsData, error: partsError } = await supabase
        .from('conversation_participants')
        .select('id')
        .limit(1)
      
      results.participants = {
        canRead: !partsError,
        error: partsError?.message
      }

      // Test 4: Can read messages?
      const { data: msgsData, error: msgsError } = await supabase
        .from('messages')
        .select('id')
        .limit(1)
      
      results.messages = {
        canRead: !msgsError,
        error: msgsError?.message
      }

      // Test 5: Storage buckets
      const { data: bucketsData, error: bucketsError } = await supabase
        .storage
        .listBuckets()
      
      results.storageBuckets = {
        buckets: bucketsData?.map(b => b.name) || [],
        error: bucketsError?.message
      }

      setTestResults(results)
      
      const allPassed = results.users.canRead && 
                        results.conversations.canRead && 
                        results.participants.canRead && 
                        results.messages.canRead

      if (allPassed) {
        toast.success('All RLS tests passed!')
      } else {
        toast.error('Some RLS tests failed - check results')
      }

    } catch (error) {
      toast.error('RLS test failed')
      console.error(error)
    } finally {
      setIsTestingRLS(false)
    }
  }

  const testMessagesLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Not logged in')
        return
      }

      console.log('🧪 Testing message load for user:', user.id)

      // Test getUserConversations
      const { data: convsData, error: convsError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (id, name, is_group)
        `)
        .eq('user_id', user.id)
        .limit(5)

      console.log('Conversations test:', { 
        success: !convsError, 
        count: convsData?.length,
        error: convsError 
      })

      if (convsData && convsData.length > 0) {
        const firstConv = (convsData[0] as any).conversations
        console.log('First conversation:', firstConv)

        // Test getConversationMessages
        const { data: msgsData, error: msgsError } = await supabase
          .from('messages')
          .select(`
            *,
            users!messages_sender_id_fkey (id, username, display_name)
          `)
          .eq('conversation_id', firstConv.id)
          .limit(10)

        console.log('Messages test:', {
          success: !msgsError,
          count: msgsData?.length,
          error: msgsError
        })

        if (msgsError) {
          toast.error(`Messages error: ${msgsError.message}`)
        } else {
          toast.success(`Loaded ${msgsData?.length || 0} messages from first conversation`)
        }
      } else {
        toast.info('No conversations found for testing')
      }

    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`)
      console.error('Test error:', error)
    }
  }

  if (!testResults) {
    return (
      <Card className="fixed bottom-20 right-4 w-80 z-50">
        <CardHeader>
          <CardTitle className="text-sm">RLS Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={testRLSPolicies} 
            disabled={isTestingRLS}
            className="w-full"
            size="sm"
          >
            {isTestingRLS ? 'Testing...' : 'Test RLS Policies'}
          </Button>
          <Button 
            onClick={testMessagesLoad}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Test Message Load
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="fixed bottom-20 right-4 w-96 max-h-96 overflow-auto z-50">
      <CardHeader>
        <CardTitle className="text-sm flex justify-between">
          RLS Test Results
          <Button variant="ghost" size="sm" onClick={() => setTestResults(null)}>×</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {Object.entries(testResults).map(([key, value]: [string, any]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="font-medium">{key}:</span>
            {value.canRead !== undefined ? (
              <Badge variant={value.canRead ? "default" : "destructive"}>
                {value.canRead ? '✅ OK' : `❌ ${value.error}`}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[10px]">
                {JSON.stringify(value).substring(0, 50)}
              </span>
            )}
          </div>
        ))}
        <Button onClick={testRLSPolicies} size="sm" className="w-full mt-4">
          Retest
        </Button>
      </CardContent>
    </Card>
  )
}

