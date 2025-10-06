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
import { BiometricVerificationDialog } from './BiometricVerificationDialog'
import { useBiometricVerification } from '@/hooks/useBiometricVerification'
import { BiometricAuthService } from '@/lib/biometric-auth'

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
  
  // Biometric verification hook
  const { 
    verificationState, 
    executeWithBiometricVerification, 
    closeVerification 
  } = useBiometricVerification(currentUser.id)

  useEffect(() => {
    const loadKeys = async () => {
      const keys = await getStoredKeys()
      setKeyPair(keys)
    }
    
    // Add demo messages
    const demoMessages: Message[] = [
      {
        id: 'demo-msg-1',
        conversation_id: 'demo-1',
        sender_id: 'demo-user-1',
        senderName: 'Alice Johnson',
        encrypted_content: 'Hey! How are you doing?',
        timestamp: Date.now() - 300000, // 5 minutes ago
        status: 'read',
        isEncrypted: false,
        type: 'text'
      },
      {
        id: 'demo-msg-2',
        conversation_id: 'demo-1',
        sender_id: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        encrypted_content: 'Hi Alice! I\'m doing great, thanks for asking 😊',
        timestamp: Date.now() - 240000, // 4 minutes ago
        status: 'read',
        isEncrypted: false,
        type: 'text'
      },
      {
        id: 'demo-msg-3',
        conversation_id: 'demo-1',
        sender_id: 'demo-user-1',
        senderName: 'Alice Johnson',
        encrypted_content: 'That\'s wonderful! I wanted to share some exciting news with you.',
        timestamp: Date.now() - 180000, // 3 minutes ago
        status: 'read',
        isEncrypted: false,
        type: 'text'
      },
      {
        id: 'demo-msg-4',
        conversation_id: 'demo-1',
        sender_id: 'demo-user-1',
        senderName: 'Alice Johnson',
        encrypted_content: 'Our project got approved! 🎉',
        timestamp: Date.now() - 120000, // 2 minutes ago
        status: 'read',
        isEncrypted: false,
        type: 'text'
      },
      {
        id: 'demo-msg-5',
        conversation_id: 'demo-1',
        sender_id: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        encrypted_content: 'Wow, that\'s amazing! Congratulations! 🎊',
        timestamp: Date.now() - 60000, // 1 minute ago
        status: 'delivered',
        isEncrypted: false,
        type: 'text'
      }
    ]
    
    setMessages(demoMessages)
    loadKeys()
  }, [currentUser.id, currentUser.displayName, currentUser.username, setMessages])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const userConversations = await getUserConversations(currentUser.id)
        let loadedConversations = userConversations.map((item: any) => ({
          ...item.conversations,
          otherParticipant: null // Would be populated with other participant info
        }))
        
        // Add demo conversations if none exist
        if (loadedConversations.length === 0) {
          loadedConversations = [
            {
              id: 'demo-1',
              name: 'Alice Johnson',
              is_group: false,
              access_code: 'demo-access-1',
              created_by: 'demo-user-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              otherParticipant: {
                id: 'demo-user-1',
                username: 'alice_j',
                display_name: 'Alice Johnson',
                avatar_url: null,
                status: 'online' as const
              }
            },
            {
              id: 'demo-2',
              name: 'Project Team',
              is_group: true,
              access_code: 'demo-access-2',
              created_by: 'demo-user-2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              otherParticipant: {
                id: 'demo-user-2',
                username: 'project-team',
                display_name: 'Project Team',
                avatar_url: null,
                status: 'online' as const
              }
            },
            {
              id: 'demo-3',
              name: 'Bob Smith',
              is_group: false,
              access_code: 'demo-access-3',
              created_by: 'demo-user-3',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              otherParticipant: {
                id: 'demo-user-3',
                username: 'bob_smith',
                display_name: 'Bob Smith',
                avatar_url: null,
                status: 'away' as const
              }
            }
          ]
        }
        
        setConversations(loadedConversations)
        
        // Auto-select first conversation for demo
        if (loadedConversations.length > 0 && !activeConversation) {
          setActiveConversation(loadedConversations[0])
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
        // Show demo conversations on error
        const demoConversations = [
          {
            id: 'demo-1',
            name: 'Alice Johnson',
            is_group: false,
            access_code: 'demo-access-1',
            created_by: 'demo-user-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            otherParticipant: {
              id: 'demo-user-1',
              username: 'alice_j',
              display_name: 'Alice Johnson',
              avatar_url: null,
              status: 'online' as const
            }
          }
        ]
        
        setConversations(demoConversations)
        
        // Auto-select first conversation for demo
        if (!activeConversation) {
          setActiveConversation(demoConversations[0])
        }
      }
    }

    loadConversations()
  }, [currentUser.id, setConversations])

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

    await executeWithBiometricVerification(
      'create this conversation',
      async () => {
        await performCreateConversation()
      }
    )
  }

  const performCreateConversation = async () => {
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

  const handleStartConversationWithUser = async (targetUser: UserSearchResult) => {
    await executeWithBiometricVerification(
      `start a secure conversation with ${targetUser.display_name || targetUser.username}`,
      async () => {
        await performStartConversationWithUser(targetUser)
      }
    )
  }

  const performStartConversationWithUser = async (targetUser: UserSearchResult) => {
    try {
      // Generate access code for the new conversation
      const accessCode = generateAccessCode()
      
      // Create conversation
      const conversation = await createConversation(
        `Chat with ${targetUser.display_name || targetUser.username}`,
        false, // not a group
        currentUser.id,
        accessCode
      )

      // Add to local state
      setConversations((prev) => [...(prev || []), conversation])
      
      // Set as active conversation
      setActiveConversation(conversation)
      
      toast.success(`Started conversation! Share access code "${accessCode}" with ${targetUser.display_name || targetUser.username} to connect`, {
        duration: 8000,
        action: {
          label: 'Copy Code',
          onClick: () => navigator.clipboard.writeText(accessCode)
        }
      })

      // Close search dialog
      setShowUserSearch(false)
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast.error('Failed to start conversation')
    }
  }

  const handleJoinConversation = async () => {
    if (!joinAccessCode.trim()) {
      toast.error('Please enter an access code')
      return
    }

    await executeWithBiometricVerification(
      'join this conversation',
      async () => {
        await performJoinConversation(joinAccessCode)
      }
    )
  }

  const performJoinConversation = async (accessCode: string) => {
    try {
      const result = await joinConversation(accessCode, currentUser.id)
      
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

  const getLastMessageTime = (conversationId: string) => {
    const conversationMessages = messages?.filter(m => m.conversation_id === conversationId) || []
    if (conversationMessages.length === 0) return 'now'
    
    const lastMessage = conversationMessages[conversationMessages.length - 1]
    const timeDiff = Date.now() - lastMessage.timestamp
    
    if (timeDiff < 60000) return 'now'
    if (timeDiff < 3600000) return `${Math.floor(timeDiff / 60000)}m`
    if (timeDiff < 86400000) return `${Math.floor(timeDiff / 3600000)}h`
    return `${Math.floor(timeDiff / 86400000)}d`
  }

  const getLastMessagePreview = (conversationId: string) => {
    const conversationMessages = messages?.filter(m => m.conversation_id === conversationId) || []
    if (conversationMessages.length === 0) return 'No messages yet'
    
    const lastMessage = conversationMessages[conversationMessages.length - 1]
    const content = lastMessage.decryptedContent || (typeof lastMessage.encrypted_content === 'string' ? lastMessage.encrypted_content : 'Encrypted message')
    const prefix = lastMessage.sender_id === currentUser.id ? 'You: ' : ''
    
    return prefix + (content.length > 30 ? content.substring(0, 30) + '...' : content)
  }

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !keyPair) return

    // Check if this is the first message in the conversation (sensitive key exchange)
    const conversationMessages = (messages || []).filter(m => m.conversation_id === activeConversation.id)
    const isFirstMessage = conversationMessages.length === 0
    
    if (isFirstMessage) {
      await executeWithBiometricVerification(
        'send the first message in this secure conversation',
        async () => {
          await performSendMessage()
        }
      )
    } else {
      await performSendMessage()
    }
  }

  const performSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !keyPair) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const messageToSend = newMessage
    
    // Create initial message
    const initialMessage: Message = {
      id: messageId,
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      encrypted_content: messageToSend,
      timestamp: Date.now(),
      status: 'sending',
      isEncrypted: false,
      type: 'text'
    }

    // Add to messages immediately for instant UI feedback
    setMessages((currentMessages) => [...(currentMessages || []), initialMessage])
    setNewMessage('')
    setIsEncrypting(true)
    setShowEncryptionDialog(true)

    try {
      // Simulate encryption process
      const encryptedContent = await encryptMessage(
        messageToSend,
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
        { algorithm: 'PQC-AES-256-GCM-RSA2048', bitLength: 2048 }
      )

      // Update message status
      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                encrypted_content: encryptedContent, 
                isEncrypted: true,
                status: 'sent'
              }
            : msg
        )
      )
      
      setShowEncryptionDialog(false)
      
    } catch (error) {
      console.error('Encryption failed:', error)
      setMessages((currentMessages) => 
        (currentMessages || []).filter(msg => msg.id !== messageId)
      )
      toast.error('Failed to encrypt message. Please try again.')
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
          // Handle decryption progress
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
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden facebook-card facebook-chat-container">
      <div className="flex h-full">
        {/* Conversations Sidebar - Facebook Style */}
        <div className="w-80 bg-white border-r border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Chats</h1>
              <div className="flex gap-2">
                <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                  <DialogTrigger asChild>
                    <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
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
                        <Label htmlFor="conversation-password">Conversation Password</Label>
                        <Input
                          id="conversation-password"
                          type="password"
                          placeholder="Set a secure password"
                          value={conversationPassword}
                          onChange={(e) => setConversationPassword(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          This password will be used to encrypt all messages in this conversation
                        </p>
                      </div>
                      <Button onClick={handleCreateConversation} className="w-full">
                        <Shield className="w-4 h-4 mr-2" />
                        Create Conversation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showJoinConversation} onOpenChange={setShowJoinConversation}>
                  <DialogTrigger asChild>
                    <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <UserPlus className="w-5 h-5 text-gray-600" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Conversation</DialogTitle>
                      <DialogDescription>
                        Enter an access code to join an existing secure conversation
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
                <div className="relative">
                  <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    placeholder="Search conversations..."
                    readOnly
                  />
                </div>
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
                          <Card key={user.id} className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{user.display_name || user.username}</p>
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                                  {user.status}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartConversationWithUser(user)}
                                  className="text-xs"
                                >
                                  <ChatCircle className="w-3 h-3 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">No users found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Conversations List */}
          <div className="h-[calc(100%-120px)] overflow-y-auto facebook-chat-scroll">
            {conversations?.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer facebook-conversation-item ${
                  activeConversation?.id === conversation.id ? 'facebook-conversation-active' : ''
                }`}
                onClick={() => setActiveConversation(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full facebook-avatar flex items-center justify-center text-white font-semibold text-lg">
                      {(conversation.name || 'PC').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full facebook-online-indicator"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {conversation.name || 'Private Conversation'}
                      </h3>
                      <span className="text-xs text-gray-500">{getLastMessageTime(conversation.id)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {getLastMessagePreview(conversation.id)}
                      </p>
                      {conversation.access_code && (
                        <button
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(conversation.access_code!)
                            toast.success('Access code copied!')
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!conversations || conversations.length === 0) && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowNewConversation(true)}
                >
                  Start a conversation
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-[600px]">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                    {(activeConversation.name || 'PC').substring(0, 2).toUpperCase()}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {activeConversation.name || 'Private Conversation'}
                    </h2>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Active now</span>
                      <Lock className="w-3 h-3 ml-2" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    🛡️ Encrypted
                  </Badge>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 facebook-chat-scroll">
                <div className="space-y-3">
                  {getFilteredMessages().map((message, index) => {
                    const isOwn = message.sender_id === currentUser.id
                    const showAvatar = !isOwn && (index === 0 || getFilteredMessages()[index - 1]?.sender_id !== message.sender_id)
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                          !showAvatar && !isOwn ? 'ml-10' : ''
                        }`}
                      >
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold mr-2 mt-auto">
                            {message.senderName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-xs lg:max-w-md facebook-chat-bubble ${isOwn ? 'order-1' : 'order-2'}`}>
                          <div
                            className={`px-4 py-2 ${
                              isOwn
                                ? 'facebook-chat-bubble-own'
                                : 'facebook-chat-bubble-other'
                            }`}
                          >
                            {message.isEncrypted ? (
                              <div className="space-y-2">
                                <div className={`flex items-center gap-2 text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                  <Lock className="w-3 h-3" />
                                  <span>Encrypted</span>
                                </div>
                                {message.decryptedContent ? (
                                  <p className="text-sm leading-relaxed">{message.decryptedContent}</p>
                                ) : (
                                  <div className="space-y-2">
                                    <div className={`text-xs font-mono ${isOwn ? 'text-blue-100' : 'text-gray-400'} truncate`}>
                                      {typeof message.encrypted_content === 'object' && message.encrypted_content.data?.slice(0, 30)}...
                                    </div>
                                    <button
                                      onClick={() => handleDecryptMessage(message)}
                                      disabled={isDecrypting}
                                      className={`text-xs underline ${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                                    >
                                      <Eye className="w-3 h-3 inline mr-1" />
                                      Decrypt
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">{message.encrypted_content as string}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {isOwn && (
                              <div className="flex items-center">
                                {getStatusIcon(message.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isEncrypting && handleSendMessage()}
                      disabled={isEncrypting}
                      className="w-full px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all facebook-input"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isEncrypting}
                    className={`w-10 h-10 rounded-full flex items-center justify-center facebook-send-button ${
                      newMessage.trim() && !isEncrypting
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isEncrypting ? (
                      <Shield className="w-5 h-5 animate-pulse" />
                    ) : (
                      <PaperPlaneRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Messages are end-to-end encrypted</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChatCircle className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h2>
                <p className="text-gray-600 mb-6">
                  Send private photos and messages to a friend or group
                </p>
                <Button onClick={() => setShowNewConversation(true)} className="facebook-button">
                  Send message
                </Button>
              </div>
            </div>
          )}
        </div>
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

      {/* Biometric Verification Dialog */}
      <BiometricVerificationDialog
        open={verificationState.isOpen}
        onOpenChange={closeVerification}
        onSuccess={verificationState.onSuccess || (() => {})}
        onCancel={verificationState.onCancel || (() => {})}
        title="Secure Conversation Access"
        description="This conversation requires biometric verification for enhanced security."
        action={verificationState.action}
        userId={currentUser.id}
      />
    </div>
  )
}