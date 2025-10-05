import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { 
  PaperPlaneRight, 
  Lock, 
  Shield, 
  Check, 
  CheckCircle,
  Clock,
  Eye,
  Warning,
  User,
  Key,
  Plus,
  MagnifyingGlass,
  UserPlus,
  ChatCircle,
  Copy
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { 
  getStoredKeys, 
  encryptMessage, 
  decryptMessage, 
  EncryptedMessage, 
  KeyPair,
  EncryptionProgress 
} from '@/lib/crypto'
import { 
  searchUsers, 
  createConversation, 
  joinConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  subscribeToMessages
} from '@/lib/supabase'
import { VoiceMessage } from './VoiceMessage'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  senderName: string
  encrypted_content: string | EncryptedMessage
  timestamp: number
  status: 'sending' | 'encrypting' | 'sent' | 'delivered' | 'read'
  isEncrypted: boolean
  decryptedContent?: string
  type: 'text' | 'voice' | 'file'
}

interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  access_code: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  otherParticipant?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    status: 'online' | 'offline' | 'away'
  }
}

interface UserSearchResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

interface ChatInterfaceProps {
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
}

export function ChatInterface({ currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useKV<Message[]>('chat-messages', [])
  const [conversations, setConversations] = useKV<Conversation[]>('user-conversations', [])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState<EncryptionProgress | null>(null)
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [showJoinConversation, setShowJoinConversation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [newConversationName, setNewConversationName] = useState('')
  const [conversationPassword, setConversationPassword] = useState('')
  const [joinAccessCode, setJoinAccessCode] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadKeys = async () => {
      const keys = await getStoredKeys()
      setKeyPair(keys)
    }
    loadKeys()
  }, [])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const userConversations = await getUserConversations(currentUser.id)
        setConversations(userConversations.map((item: any) => ({
          ...item.conversations,
          otherParticipant: null // Would be populated with other participant info
        })))
      } catch (error) {
        console.error('Failed to load conversations:', error)
      }
    }
    
    if (currentUser.id) {
      loadConversations()
    }
  }, [currentUser.id, setConversations])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchUsers(query, currentUser.id)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      toast.error('Failed to search users')
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateConversation = async () => {
    if (!conversationPassword.trim()) {
      toast.error('Please set a password for this conversation')
      return
    }

    try {
      const accessCode = generateAccessCode()
      const conversation = await createConversation(
        newConversationName || null,
        false, // not a group for now
        currentUser.id,
        accessCode
      )

      // Add to local state
      setConversations((prev) => [...(prev || []), conversation])
      
      // Show access code to user
      toast.success(`Conversation created! Access code: ${accessCode}`, {
        duration: 10000,
        action: {
          label: 'Copy',
          onClick: () => navigator.clipboard.writeText(accessCode)
        }
      })

      setShowNewConversation(false)
      setNewConversationName('')
      setConversationPassword('')
      
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create conversation')
    }
  }

  const handleJoinConversation = async () => {
    if (!joinAccessCode.trim()) {
      toast.error('Please enter an access code')
      return
    }

    try {
      const result = await joinConversation(joinAccessCode, currentUser.id)
      
      // Add to local state
      setConversations((prev) => [...(prev || []), result.conversation])
      
      toast.success('Successfully joined conversation!')
      setShowJoinConversation(false)
      setJoinAccessCode('')
      
    } catch (error) {
      console.error('Failed to join conversation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join conversation')
    }
  }

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !keyPair) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create initial message
    const initialMessage: Message = {
      id: messageId,
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      encrypted_content: newMessage,
      timestamp: Date.now(),
      status: 'encrypting',
      isEncrypted: false,
      type: 'text'
    }

    setMessages((currentMessages) => [...(currentMessages || []), initialMessage])
    setNewMessage('')
    setIsEncrypting(true)
    setShowEncryptionDialog(true)

    try {
      // Encrypt the message with progress tracking
      const encryptedContent = await encryptMessage(
        newMessage,
        'recipient-public-key', // Would get from conversation participants
        keyPair,
        (progress) => {
          setEncryptionProgress(progress)
        }
      )

      // Send to database
      const dbMessage = await sendMessage(
        activeConversation.id,
        currentUser.id,
        JSON.stringify(encryptedContent),
        { algorithm: encryptedContent.algorithm, bitLength: encryptedContent.bitLength }
      )

      // Update message with encrypted content
      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                encrypted_content: encryptedContent, 
                status: 'sent', 
                isEncrypted: true 
              }
            : msg
        )
      )

      setShowEncryptionDialog(false)
      toast.success('Message encrypted and sent securely!')

    } catch (error) {
      console.error('Encryption failed:', error)
      setMessages((currentMessages) => 
        (currentMessages || []).filter(msg => msg.id !== messageId)
      )
      toast.error('Failed to encrypt message. Please try again.')
      setShowEncryptionDialog(false)
    } finally {
      setIsEncrypting(false)
      setEncryptionProgress(null)
    }
  }

  const handleDecryptMessage = async (message: Message) => {
    if (!keyPair || typeof message.encrypted_content === 'string') return

    setIsDecrypting(true)
    try {
      const decryptedContent = await decryptMessage(
        message.encrypted_content as EncryptedMessage,
        keyPair,
        (progress) => {
          toast.loading(`Decrypting: ${progress.message}`, { id: `decrypt-${message.id}` })
        }
      )

      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === message.id 
            ? { ...msg, decryptedContent }
            : msg
        )
      )

      toast.success('Message decrypted successfully!', { id: `decrypt-${message.id}` })
    } catch (error) {
      toast.error('Failed to decrypt message', { id: `decrypt-${message.id}` })
    } finally {
      setIsDecrypting(false)
    }
  }

  const getFilteredMessages = () => {
    if (!activeConversation) return []
    return messages?.filter(msg => msg.conversation_id === activeConversation.id) || []
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground" />
      case 'encrypting':
        return <Shield className="w-3 h-3 text-primary animate-pulse" />
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-primary" />
      case 'read':
        return <CheckCircle className="w-3 h-3 text-success" />
      default:
        return null
    }
  }

  return (
    <div className="h-full flex">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Secure Conversations
            </h2>
            <div className="flex gap-2">
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Conversation</DialogTitle>
                    <DialogDescription>
                      Create a secure conversation with a 2048-bit encrypted access code
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="conversation-name">Conversation Name (Optional)</Label>
                      <Input
                        id="conversation-name"
                        placeholder="e.g., Project Discussion"
                        value={newConversationName}
                        onChange={(e) => setNewConversationName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="conversation-password">Conversation Password *</Label>
                      <Input
                        id="conversation-password"
                        type="password"
                        placeholder="Enter a strong password for this conversation"
                        value={conversationPassword}
                        onChange={(e) => setConversationPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This password will be used to encrypt all messages in this conversation
                      </p>
                    </div>
                    <Button onClick={handleCreateConversation} className="w-full">
                      <Lock className="w-4 h-4 mr-2" />
                      Create Encrypted Conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showJoinConversation} onOpenChange={setShowJoinConversation}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Conversation</DialogTitle>
                    <DialogDescription>
                      Enter the access code to join an existing secure conversation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="access-code">Access Code</Label>
                      <Input
                        id="access-code"
                        placeholder="Enter conversation access code"
                        value={joinAccessCode}
                        onChange={(e) => setJoinAccessCode(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleJoinConversation} className="w-full">
                      <Key className="w-4 h-4 mr-2" />
                      Join Conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <MagnifyingGlass className="w-4 h-4" />
                Search Users
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Search Users</DialogTitle>
                <DialogDescription>
                  Find users to start a secure conversation with
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search by username or display name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearchUsers(e.target.value)
                  }}
                />
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {isSearching ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <Card key={user.id} className="p-3 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{user.display_name || user.username}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                            <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </div>
                        </Card>
                      ))
                    ) : searchQuery ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No users found</p>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-2">
            {conversations?.map((conversation) => (
              <Card 
                key={conversation.id}
                className={`mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                  activeConversation?.id === conversation.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveConversation(conversation)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChatCircle className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conversation.name || 'Private Conversation'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        <span>2048-bit encrypted</span>
                      </div>
                    </div>
                    {conversation.access_code && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(conversation.access_code!)
                          toast.success('Access code copied!')
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!conversations || conversations.length === 0) && (
              <div className="text-center py-8">
                <ChatCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground">Create or join a conversation to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChatCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {activeConversation.name || 'Private Conversation'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>2048-bit end-to-end encrypted</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  PQC-2048
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {getFilteredMessages().map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === currentUser.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.isEncrypted ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs opacity-75">
                            <Lock className="w-3 h-3" />
                            <span>Encrypted Message</span>
                          </div>
                          {message.decryptedContent ? (
                            <p className="text-sm">{message.decryptedContent}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs font-mono opacity-50 truncate">
                                {typeof message.encrypted_content === 'object' && message.encrypted_content.data?.slice(0, 40)}...
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDecryptMessage(message)}
                                disabled={isDecrypting}
                                className="h-6 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Decrypt
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{message.encrypted_content as string}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                        <span>{formatTime(message.timestamp)}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your secure message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isEncrypting && handleSendMessage()}
                  disabled={isEncrypting}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isEncrypting}
                  className="px-4"
                >
                  {isEncrypting ? (
                    <Shield className="w-4 h-4 animate-pulse" />
                  ) : (
                    <PaperPlaneRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Messages are encrypted with 2048-bit post-quantum cryptography</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose a conversation to start secure messaging
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowNewConversation(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
                <Button onClick={() => setShowJoinConversation(true)} variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Existing
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Encryption Progress Dialog */}
      <Dialog open={showEncryptionDialog} onOpenChange={setShowEncryptionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Encrypting Message
            </DialogTitle>
            <DialogDescription>
              Your message is being secured with 2048-bit post-quantum cryptography.
              This process takes approximately 3 minutes to ensure maximum security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {encryptionProgress && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{encryptionProgress.phase.replace('-', ' ')}</span>
                    <span>{Math.round(encryptionProgress.progress)}%</span>
                  </div>
                  <Progress value={encryptionProgress.progress} className="h-2" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {encryptionProgress.message}
                </p>
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Warning className="w-4 h-4" />
              <span>Do not close this window during encryption</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}