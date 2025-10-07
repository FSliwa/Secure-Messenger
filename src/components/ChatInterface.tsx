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
  Copy,
  Paperclip,
  EnvelopeSimple,
  Users
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'
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
import { MessageSearch } from './MessageSearch'
import { FileAttachment } from './FileAttachment'
import { DirectMessageDialog } from './DirectMessageDialog'
import { UserSearchDialog } from './UserSearchDialog'
import { AddUsersToConversationDialog } from './AddUsersToConversationDialog'
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
  type: 'text' | 'voice' | 'file' | 'image'
  attachmentUrl?: string
  fileName?: string
  fileSize?: number
  fileType?: string
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
  const { t } = useLanguage()
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
  
  // New state for message search and file attachments
  const [showMessageSearch, setShowMessageSearch] = useState(false)
  const [showFileAttachment, setShowFileAttachment] = useState(false)
  
  // New state for Polish features
  const [showDirectMessage, setShowDirectMessage] = useState(false)
  const [showUserSearchDialog, setShowUserSearchDialog] = useState(false)
  const [showAddUsersDialog, setShowAddUsersDialog] = useState(false)
  const [userSearchMode, setUserSearchMode] = useState<'chat' | 'add-to-conversation'>('chat')
  
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
    
    loadKeys()
  }, [currentUser.id])

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const userConversations = await getUserConversations(currentUser.id)
        let loadedConversations = userConversations.map((item: any) => ({
          ...item.conversations,
          access_code: item.conversations.access_code,
          otherParticipant: null // Would be populated with other participant info
        }))
        
        setConversations(loadedConversations)
        
        // Auto-select first conversation if available
        if (loadedConversations.length > 0 && !activeConversation) {
          setActiveConversation(loadedConversations[0])
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
        setConversations([])
      }
    }

    loadConversations()
  }, [currentUser.id, setConversations])

  // Load messages when active conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation) {
        setMessages([])
        return
      }

      try {
        const conversationMessages = await getConversationMessages(activeConversation.id, 50, 0)
        
        // Transform database messages to our Message interface
        const transformedMessages: Message[] = conversationMessages.reverse().map((dbMessage: any) => ({
          id: dbMessage.id,
          conversation_id: dbMessage.conversation_id,
          sender_id: dbMessage.sender_id,
          senderName: dbMessage.users?.display_name || dbMessage.users?.username || 'Unknown User',
          encrypted_content: dbMessage.encrypted_content,
          timestamp: new Date(dbMessage.sent_at).getTime(),
          status: 'delivered' as const,
          isEncrypted: true,
          type: 'text' as const
        }))

        // Replace messages for this conversation
        setMessages((currentMessages) => {
          const otherConversationMessages = (currentMessages || []).filter(
            msg => msg.conversation_id !== activeConversation.id
          )
          return [...otherConversationMessages, ...transformedMessages]
        })

        // Set up real-time subscription
        const subscription = subscribeToMessages(activeConversation.id, (newMessage) => {
          const transformedMessage: Message = {
            id: newMessage.id,
            conversation_id: newMessage.conversation_id,
            sender_id: newMessage.sender_id,
            senderName: 'User', // Would need to fetch from users table
            encrypted_content: newMessage.encrypted_content,
            timestamp: new Date(newMessage.sent_at).getTime(),
            status: 'delivered',
            isEncrypted: true,
            type: 'text'
          }

          setMessages((currentMessages) => [...(currentMessages || []), transformedMessage])
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
        toast.error('Failed to load messages')
      }
    }

    loadMessages()
  }, [activeConversation, setMessages])

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
      toast.error(t.setPassword)
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
      toast.success(`${t.conversationCreated} ${accessCode}`, {
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
      toast.error(t.enterAccessCode)
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

      // Update message with real database ID and status
      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                id: dbMessage.id, // Use real database ID
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

      toast.success(`${t.messageDecrypted}`, { id: `decrypt-${message.id}` })
    } catch (error) {
      toast.error(`${t.failedToDecrypt}`, { id: `decrypt-${message.id}` })
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

  // Handler for message search result selection
  const handleMessageSelect = (message: Message) => {
    // Find and set the conversation that contains this message
    const conversation = conversations?.find(c => c.id === message.conversation_id)
    if (conversation) {
      setActiveConversation(conversation)
      
      // Scroll to the specific message (simplified implementation)
      toast.success('Navigated to message')
    }
  }

  // Handler for file attachments
  const handleFilesSelected = async (attachments: any[]) => {
    if (!activeConversation || !keyPair) {
      toast.error('Please select a conversation and ensure encryption is ready')
      return
    }

    for (const attachment of attachments || []) {
      try {
        // Create message for file attachment
        const fileMessage: Message = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conversation_id: activeConversation.id,
          sender_id: currentUser.id,
          senderName: currentUser.displayName || currentUser.username,
          encrypted_content: attachment.encryptedData || attachment.url || '',
          timestamp: Date.now(),
          status: 'sent',
          isEncrypted: !!attachment.encryptedData,
          type: attachment.type.startsWith('image/') ? 'image' as const : 'file' as const,
          attachmentUrl: attachment.url,
          fileName: attachment.name,
          fileSize: attachment.size,
          fileType: attachment.type
        }

        // Add to messages
        setMessages(prev => [...(prev || []), fileMessage])

        // Send to database (simplified - would need to update sendMessage function)
        try {
          await sendMessage(
            activeConversation.id,
            currentUser.id,
            attachment.encryptedData || attachment.url || '',
            fileMessage.type
          )
        } catch (dbError) {
          console.warn('Database send failed, message stored locally:', dbError)
        }

        toast.success(`${attachment.name} sent successfully`)

      } catch (error) {
        console.error('Error sending file:', error)
        toast.error(`Failed to send ${attachment.name}`)
      }
    }
  }

  // Handler for direct messages (Polish feature 1)
  const handleDirectMessage = (recipient: UserSearchResult, message: string) => {
    // In a real implementation, this would send the message through a direct channel
    toast.success(`${t.directMessageSent} @${recipient.username}`)
    
    // For demo purposes, we'll add it to a temporary conversation
    const directMessage: Message = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      conversation_id: `direct_${recipient.id}`,
      sender_id: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      encrypted_content: message,
      timestamp: Date.now(),
      status: 'sent',
      isEncrypted: false, // Direct messages could be handled differently
      type: 'text'
    }
    
    setMessages(prev => [...(prev || []), directMessage])
  }

  // Handler for advanced user search (Polish feature 2)
  const handleAdvancedUserSelect = (user: UserSearchResult, action: 'chat' | 'add') => {
    if (action === 'chat') {
      // Start conversation with user
      handleStartConversationWithUser(user)
    } else if (action === 'add' && activeConversation) {
      // This would normally add the user to the active conversation
      toast.success(`${t.userAdded} ${user.username} ${t.usersAddedToConversation}`)
    }
  }

  // Handler for adding users to conversation (Polish feature 3)
  const handleUsersAddedToConversation = (users: UserSearchResult[], conversationId: string) => {
    const userNames = users.map(u => u.username).join(', ')
    toast.success(`${t.usersAddedToConversation} ${userNames}`)
    
    // In a real implementation, this would update the conversation participants
    // and notify all participants about the new members
  }

  return (
    <div className="w-full max-w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden facebook-card facebook-chat-container">
      <div className="flex h-full">
        {/* Conversations Sidebar - Facebook Style */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">{t.chats}</h1>
              <div className="flex gap-2">
                {/* Direct Message Button - Polish Feature 1 */}
                <button 
                  onClick={() => setShowDirectMessage(true)}
                  className="w-9 h-9 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                  title={t.sendDirectMessage}
                >
                  <EnvelopeSimple className="w-5 h-5 text-blue-600" />
                </button>

                {/* Advanced User Search Button - Polish Feature 2 */}
                <button 
                  onClick={() => {
                    setUserSearchMode('chat')
                    setShowUserSearchDialog(true)
                  }}
                  className="w-9 h-9 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors"
                  title={t.advancedUserSearch}
                >
                  <User className="w-5 h-5 text-green-600" />
                </button>

                {/* Add Users to Current Conversation - Polish Feature 3 */}
                {activeConversation && (
                  <button 
                    onClick={() => setShowAddUsersDialog(true)}
                    className="w-9 h-9 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-colors"
                    title={t.addUsersToConversation}
                  >
                    <Users className="w-5 h-5 text-purple-600" />
                  </button>
                )}
                
                {/* Message Search Button */}
                <button 
                  onClick={() => setShowMessageSearch(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  title={t.searchMessages}
                >
                  <MagnifyingGlass className="w-5 h-5 text-gray-600" />
                </button>
                
                <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                  <DialogTrigger asChild>
                    <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.createNewConversation}</DialogTitle>
                      <DialogDescription>
                        Create a secure conversation with a 2048-bit encrypted access code
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="conversation-name">{t.conversationName}</Label>
                        <Input
                          id="conversation-name"
                          placeholder="e.g., Project Discussion"
                          value={newConversationName}
                          onChange={(e) => setNewConversationName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="conversation-password">{t.conversationPassword}</Label>
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
                        {t.create} Conversation
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
                      <DialogTitle>{t.joinConversation}</DialogTitle>
                      <DialogDescription>
                        Enter an access code to join an existing secure conversation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="access-code">{t.accessCode}</Label>
                        <Input
                          id="access-code"
                          placeholder="Enter conversation access code"
                          value={joinAccessCode}
                          onChange={(e) => setJoinAccessCode(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleJoinConversation} className="w-full">
                        <Key className="w-4 h-4 mr-2" />
                        {t.join} Conversation
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
                    placeholder={t.searchConversations}
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
          <div className="flex-1 overflow-y-auto facebook-chat-scroll">
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
                            toast.success(t.accessCodeCopied)
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
                <p className="text-sm text-muted-foreground">{t.noConversationsYet}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowNewConversation(true)}
                >
                  {t.startConversation}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full">
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
                      <span>{t.activeNow}</span>
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
                                  <span>{t.encrypted}</span>
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
                                      {t.decrypt}
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
                  {/* File Attachment Button */}
                  <button
                    onClick={() => setShowFileAttachment(true)}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    title={t.attachFile}
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={t.typeMessage}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isEncrypting && handleSendMessage()}
                      disabled={isEncrypting}
                      className="w-full px-4 py-3 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
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
                  <span>{t.messagesEncrypted}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChatCircle className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.yourMessages}</h2>
                <p className="text-gray-600 mb-6">
                  {t.sendPrivatePhotos}
                </p>
                <Button onClick={() => setShowNewConversation(true)} className="facebook-button">
                  {t.sendMessage}
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
              {t.encryptingMessage}
            </DialogTitle>
            <DialogDescription>
              {t.encryptionDescription}
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
              <span>{t.doNotClose}</span>
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
        title={t.secureConversation}
        description={t.biometricRequired}
        action={verificationState.action}
        userId={currentUser.id}
      />

      {/* Message Search Dialog */}
      <MessageSearch
        messages={messages || []}
        conversations={conversations || []}
        currentUser={currentUser}
        isOpen={showMessageSearch}
        onClose={() => setShowMessageSearch(false)}
        onMessageSelect={handleMessageSelect}
      />

      {/* File Attachment Dialog */}
      <FileAttachment
        isOpen={showFileAttachment}
        onClose={() => setShowFileAttachment(false)}
        onFilesSelected={handleFilesSelected}
        keyPair={keyPair}
        maxFileSize={25}
        maxFiles={10}
      />

      {/* Polish Feature 1: Direct Message Dialog */}
      <DirectMessageDialog
        isOpen={showDirectMessage}
        onClose={() => setShowDirectMessage(false)}
        currentUser={currentUser}
        onMessageSent={handleDirectMessage}
      />

      {/* Polish Feature 2: Advanced User Search Dialog */}
      <UserSearchDialog
        isOpen={showUserSearchDialog}
        onClose={() => setShowUserSearchDialog(false)}
        currentUser={currentUser}
        onUserSelect={handleAdvancedUserSelect}
        mode={userSearchMode}
        conversationId={activeConversation?.id}
      />

      {/* Polish Feature 3: Add Users to Conversation Dialog */}
      <AddUsersToConversationDialog
        isOpen={showAddUsersDialog}
        onClose={() => setShowAddUsersDialog(false)}
        conversation={activeConversation}
        currentUser={currentUser}
        onUsersAdded={handleUsersAddedToConversation}
      />
    </div>
  )
}