import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  PaperPlaneTilt, 
  Lock, 
  Shield, 
  Clock, 
  CheckCircle,
  Users,
  Plus
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { sendMessage, getMessages, subscribeToMessages, getCurrentUser, type Message } from '@/lib/supabase'
import { encryptMessage, decryptMessage, getStoredKeys } from '@/lib/crypto'

interface ChatMessage extends Message {
  decryptedContent?: string
  isDecrypting?: boolean
}

interface Contact {
  id: string
  name: string
  email: string
  publicKey: string
  isOnline?: boolean
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Demo contacts for testing
  const [contacts] = useState<Contact[]>([
    {
      id: 'demo-user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      publicKey: 'demo-public-key-alice',
      isOnline: true
    },
    {
      id: 'demo-user-2', 
      name: 'Bob Smith',
      email: 'bob@example.com',
      publicKey: 'demo-public-key-bob',
      isOnline: false
    },
    {
      id: 'demo-user-3',
      name: 'Carol White',
      email: 'carol@example.com', 
      publicKey: 'demo-public-key-carol',
      isOnline: true
    }
  ])

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages()
      
      // Subscribe to real-time messages for the conversation
      // For demo purposes, we'll use the contact ID as conversation ID
      const conversationId = `conversation-${[currentUser?.id, selectedContact.id].sort().join('-')}`
      const subscription = subscribeToMessages(conversationId, (message) => {
        decryptAndAddMessage(message)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [selectedContact, currentUser])

  const loadMessages = async () => {
    if (!selectedContact) return

    // For demo purposes, create a conversation ID from user IDs
    const conversationId = `conversation-${[currentUser?.id, selectedContact.id].sort().join('-')}`
    const { data, error } = await getMessages(conversationId)
    if (error) {
      toast.error('Failed to load messages')
      return
    }

    if (data) {
      // Decrypt messages
      const decryptedMessages = await Promise.all(
        data.map(async (msg) => ({
          ...msg,
          decryptedContent: await decryptMessage(msg.encrypted_content, getStoredKeys()?.privateKey || ''),
          isDecrypting: false
        }))
      )
      setMessages(decryptedMessages)
    }
  }

  const decryptAndAddMessage = async (message: Message) => {
    const keys = getStoredKeys()
    if (!keys) return

    const decryptedContent = await decryptMessage(message.encrypted_content, keys.privateKey)
    const chatMessage: ChatMessage = {
      ...message,
      decryptedContent,
      isDecrypting: false
    }

    setMessages(prev => [...prev, chatMessage])
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !currentUser) {
      return
    }

    const keys = getStoredKeys()
    if (!keys) {
      toast.error('Encryption keys not found. Please sign up first.')
      return
    }

    setIsLoading(true)

    try {
      // Encrypt message with recipient's public key
      const encryptedContent = await encryptMessage(newMessage, selectedContact.publicKey)
      
      // Create conversation ID for this chat
      const conversationId = `conversation-${[currentUser?.id, selectedContact.id].sort().join('-')}`
      
      // Send to database
      const { data, error } = await sendMessage(conversationId, encryptedContent)
      
      if (error) {
        // Demo mode - add message locally
        const demoMessage: ChatMessage = {
          id: `demo-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: currentUser?.id || 'current-user',
          encrypted_content: encryptedContent,
          sent_at: new Date().toISOString(),
          is_deleted: false,
          decryptedContent: newMessage,
          isDecrypting: false
        }
        
        setMessages(prev => [...prev, demoMessage])
        toast.success('Message sent (demo mode)')
      } else {
        toast.success('Message sent securely!')
      }

      setNewMessage('')
    } catch (error) {
      toast.error('Failed to send message')
      console.error('Send message error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Contacts Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Contacts</h3>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        contact.isOnline ? 'bg-accent' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-xs text-muted-foreground">
                        {contact.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {selectedContact.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedContact.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>End-to-end encrypted</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Secure
                </Badge>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Start a secure conversation with {selectedContact.name}</p>
                      <p className="text-xs mt-1">All messages are end-to-end encrypted</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isFromCurrentUser = currentUser && message.sender_id === currentUser.id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              isFromCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <p className="text-sm">
                              {message.isDecrypting ? (
                                <span className="flex items-center gap-2">
                                  <Lock className="h-3 w-3 animate-pulse" />
                                  Decrypting...
                                </span>
                              ) : (
                                message.decryptedContent || 'Encrypted message'
                              )}
                            </p>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <Clock className="h-3 w-3 opacity-50" />
                              <span className="text-xs opacity-75">
                                {formatTime(message.sent_at)}
                              </span>
                              {isFromCurrentUser && (
                                <CheckCircle className="h-3 w-3 opacity-50" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a secure message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !newMessage.trim()}
                  size="sm"
                  className="px-3"
                >
                  <PaperPlaneTilt className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Messages are encrypted end-to-end
              </p>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Select a contact</h3>
              <p className="text-sm">Choose someone to start a secure conversation</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}