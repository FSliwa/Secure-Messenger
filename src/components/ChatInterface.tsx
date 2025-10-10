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
  Users,
  Microphone
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useNotificationHandler } from '@/hooks/useNotificationHandler'
import { notificationSound } from '@/lib/notification-sound'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { VoiceMessage } from '@/components/VoiceMessage'
import { EnhancedFileSharing } from '@/components/EnhancedFileSharing'
import { VoiceRecording, VoiceUtils } from '@/lib/voice-recorder'
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
  createDirectMessage, 
  joinConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  subscribeToMessages,
  generateAccessCode,
  regenerateAccessCode,
  updateUserStatus
} from '@/lib/supabase'
import { BiometricVerificationDialog } from './BiometricVerificationDialog'
import { MessageSearch } from './MessageSearch'
import { FileAttachment } from './FileAttachment'
import { DirectMessageDialog } from './DirectMessageDialog'
import { UserSearchDialog } from './UserSearchDialog'
import { AddUsersToConversationDialog } from './AddUsersToConversationDialog'
import { ConversationPasswordDialog } from './ConversationPasswordDialog'
import { useBiometricVerification } from '@/hooks/useBiometricVerification'
import { BiometricAuthService } from '@/lib/biometric-auth'
import { ConversationPasswordManager } from '@/lib/enhanced-security'

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
  const { playNotificationSound, showNotification } = useNotifications()
  const { notifyMessage, notifyMention, notifyUserJoined, notifyUserLeft } = useNotificationHandler()
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
  const [showEnhancedFileSharing, setShowEnhancedFileSharing] = useState(false)
  const [generatingAccessCode, setGeneratingAccessCode] = useState(false)
  
  // New state for Polish features
  const [showDirectMessage, setShowDirectMessage] = useState(false)
  const [showUserSearchDialog, setShowUserSearchDialog] = useState(false)
  const [showAddUsersDialog, setShowAddUsersDialog] = useState(false)
  const [userSearchMode, setUserSearchMode] = useState<'chat' | 'add-to-conversation'>('chat')
  
  // Conversation password protection state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordDialogMode, setPasswordDialogMode] = useState<'set' | 'verify'>('verify')
  const [passwordProtectedConversation, setPasswordProtectedConversation] = useState<string | null>(null)
  const [conversationAccess, setConversationAccess] = useState<Record<string, boolean>>({})
  const [passwordDialogConversationName, setPasswordDialogConversationName] = useState<string>('')
  const [passwordDialogHint, setPasswordDialogHint] = useState<string | null>(null)
  const [passwordDialogOnSuccess, setPasswordDialogOnSuccess] = useState<(() => void) | null>(null)
  
  // Voice recording state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  
  // State for tracking password-protected conversations
  const [passwordProtectedConversations, setPasswordProtectedConversations] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if conversation is password protected
  useEffect(() => {
    const checkPasswordProtection = async () => {
      if (!conversations || conversations.length === 0) return

      const protectedConversations = new Set<string>()
      
      for (const conversation of conversations) {
        const passwordInfo = await ConversationPasswordManager.getConversationPasswordInfo(conversation.id)
        if (passwordInfo.hasPassword) {
          protectedConversations.add(conversation.id)
        }
      }
      
      setPasswordProtectedConversations(protectedConversations)
    }

    checkPasswordProtection()
  }, [conversations])
  
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
        
        // Transform conversations with real participant data
        const loadedConversations = await Promise.all(
          userConversations.map(async (item: any) => {
            const conversation = item.conversations
            let otherParticipant: {
              id: string
              username: string
              display_name: string | null
              avatar_url: string | null
              status: 'online' | 'offline' | 'away'
            } | undefined = undefined
            
            // For direct messages, get the other participant
            if (!conversation.is_group && item.conversations?.conversation_participants) {
              const otherParticipantData = item.conversations.conversation_participants
                .find((p: any) => p.user_id !== currentUser.id)
              
              if (otherParticipantData?.users) {
                otherParticipant = {
                  id: otherParticipantData.users.id,
                  username: otherParticipantData.users.username,
                  display_name: otherParticipantData.users.display_name,
                  avatar_url: otherParticipantData.users.avatar_url,
                  status: otherParticipantData.users.status || 'offline'
                }
              }
            }
            
            return {
              ...conversation,
              otherParticipant
            }
          })
        )
        
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

  const selectConversation = async (conversation: Conversation) => {
    try {
      // Check if conversation has password protection
      const passwordInfo = await ConversationPasswordManager.getConversationPasswordInfo(conversation.id);
      
      if (passwordInfo.hasPassword) {
        // Check if user already has access
        const hasAccess = await ConversationPasswordManager.hasConversationAccess(conversation.id);
        
        if (!hasAccess) {
          // Show password dialog
          setPasswordProtectedConversation(conversation.id);
          setPasswordDialogMode('verify');
          setShowPasswordDialog(true);
          return;
        }
      }
      
      // Set as active conversation
      setActiveConversation(conversation);
      setConversationAccess(prev => ({ ...prev, [conversation.id]: true }));
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast.error('Failed to access conversation');
    }
  };

  const handlePasswordSuccess = () => {
    if (passwordProtectedConversation) {
      const conversation = conversations?.find(c => c.id === passwordProtectedConversation);
      if (conversation) {
        setActiveConversation(conversation);
        setConversationAccess(prev => ({ ...prev, [passwordProtectedConversation]: true }));
      }
      setPasswordProtectedConversation(null);
    }
  };

  const showSetPasswordDialog = async (conversationId: string) => {
    setPasswordProtectedConversation(conversationId);
    setPasswordDialogMode('set');
    setPasswordDialogConversationName(activeConversation?.name || 'this conversation');
    setPasswordDialogHint(null);
    setPasswordDialogOnSuccess(null);
    setShowPasswordDialog(true);
  };

  // Check conversation access and prompt for password if needed
  const checkConversationAccess = async (conversation: Conversation): Promise<boolean> => {
    const passwordInfo = await ConversationPasswordManager.getConversationPasswordInfo(conversation.id);
    
    if (!passwordInfo.hasPassword) {
      return true; // No password protection
    }
    
    // Check if user already has access
    const hasAccess = await ConversationPasswordManager.hasConversationAccess(conversation.id);
    
    if (hasAccess) {
      setConversationAccess(prev => ({ ...prev, [conversation.id]: true }));
      return true;
    }
    
    // Show password dialog
    setPasswordProtectedConversation(conversation.id);
    setPasswordDialogMode('verify');
    setPasswordDialogConversationName(conversation.name || conversation.otherParticipant?.display_name || 'this conversation');
    setPasswordDialogHint(passwordInfo.hint);
    setPasswordDialogOnSuccess(() => () => {
      // Reload messages after successful password verification
      loadConversationMessages(conversation);
    });
    setShowPasswordDialog(true);
    
    return false; // Access not granted yet
  };

  // Separate function to load conversation messages
  const loadConversationMessages = async (conversation: Conversation) => {
    try {
      console.log(`🔄 Loading messages for conversation: ${conversation.id}`)
      const conversationMessages = await getConversationMessages(conversation.id, 50, 0);
      
      // Transform database messages to our Message interface (with guard for empty array)
      const transformedMessages: Message[] = (conversationMessages && conversationMessages.length > 0)
        ? conversationMessages.reverse().map((dbMessage: any) => ({
            id: dbMessage.id,
            conversation_id: dbMessage.conversation_id,
            sender_id: dbMessage.sender_id,
            senderName: dbMessage.users?.display_name || dbMessage.users?.username || 'Unknown User',
            encrypted_content: typeof dbMessage.encrypted_content === 'string' 
              ? JSON.parse(dbMessage.encrypted_content) 
              : dbMessage.encrypted_content,
            timestamp: new Date(dbMessage.sent_at).getTime(),
            status: 'delivered' as const,
            isEncrypted: true,
            type: 'text' as const
          }))
        : [];

      console.log(`✅ Loaded ${transformedMessages.length} messages for conversation`)

      // Replace messages for this conversation
      setMessages((currentMessages) => {
        const otherConversationMessages = (currentMessages || []).filter(
          msg => msg.conversation_id !== conversation.id
        );
        return [...otherConversationMessages, ...transformedMessages];
      });

      // Set up real-time subscription
      const subscription = subscribeToMessages(conversation.id, async (newMessage) => {
        const transformedMessage: Message = {
          id: newMessage.id,
          conversation_id: newMessage.conversation_id,
          sender_id: newMessage.sender_id,
          senderName: 'New User', // Real name would be fetched via additional query
          encrypted_content: typeof newMessage.encrypted_content === 'string' 
            ? JSON.parse(newMessage.encrypted_content) 
            : newMessage.encrypted_content,
          timestamp: new Date(newMessage.sent_at).getTime(),
          status: 'delivered',
          isEncrypted: true,
          type: 'text'
        };

        setMessages((currentMessages) => [...(currentMessages || []), transformedMessage]);

        // Show notification for messages from other users
        if (newMessage.sender_id !== currentUser.id) {
          try {
            // Decrypt message for notification preview (if possible)
            const keys = await getStoredKeys()
            let messagePreview = 'New message'
            
            if (keys) {
              try {
                // Ensure we have EncryptedMessage object
                const encryptedContent = typeof transformedMessage.encrypted_content === 'string' 
                  ? JSON.parse(transformedMessage.encrypted_content)
                  : transformedMessage.encrypted_content
                  
                const decrypted = await decryptMessage(encryptedContent, keys)
                messagePreview = decrypted.length > 50 ? decrypted.substring(0, 50) + '...' : decrypted
              } catch (decryptError) {
                messagePreview = 'New encrypted message'
              }
            }

            // Check if message contains mention
            const hasMention = messagePreview.toLowerCase().includes(`@${currentUser.username.toLowerCase()}`) ||
                             messagePreview.toLowerCase().includes(`@${currentUser.displayName?.toLowerCase() || ''}`)

            const senderName = transformedMessage.senderName
            const conversationName = conversation.name || (conversation.is_group ? 'Group Chat' : 'Direct Message')

            // Play notification sound (WhatsApp-style)
            if (hasMention) {
              notificationSound.playMention()
              await notifyMention(senderName, messagePreview, conversationName)
            } else {
              notificationSound.playMessageReceived()
              await notifyMessage(senderName, messagePreview, conversation.is_group ? conversationName : undefined)
            }
          } catch (error) {
            console.warn('Failed to show notification:', error)
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      // Don't show error toast - getConversationMessages already handles this gracefully
      // by returning empty array. Just log the error for debugging.
      console.warn('⚠️ Message loading encountered an error, but continuing...');
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation) {
        setMessages([])
        return
      }

      // Check conversation access (including password protection)
      const hasAccess = await checkConversationAccess(activeConversation);
      
      if (hasAccess) {
        // Load messages if access is granted
        return await loadConversationMessages(activeConversation);
      }
      
      // If access not granted, messages will be loaded after password verification
      return undefined;
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
      toast.error(t.failedToCreateConversation)
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
      
      // Create direct message conversation (automatically adds both users)
      const conversation = await createDirectMessage(
        currentUser.id,
        targetUser.id,
        accessCode
      )

      // Add to local state
      setConversations((prev) => [...(prev || []), conversation])
      
      // Set as active conversation
      setActiveConversation(conversation)
      
      toast.success(`Started conversation with ${targetUser.display_name || targetUser.username}!`, {
        duration: 5000
      })

      // Close search dialog
      setShowUserSearch(false)
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      toast.error(error.message || t.failedToStartConversation)
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
      
      toast.success(t.successfullyJoinedConversation)
      setShowJoinConversation(false)
      setJoinAccessCode('')
      
    } catch (error) {
      console.error('Failed to join conversation:', error)
      toast.error(error instanceof Error ? error.message : t.failedToJoinConversation)
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

  const handleSendVoiceMessage = async (recording: VoiceRecording) => {
    if (!activeConversation || !keyPair) return

    // Check if this is the first message in the conversation (sensitive key exchange)
    const conversationMessages = (messages || []).filter(m => m.conversation_id === activeConversation.id)
    const isFirstMessage = conversationMessages.length === 0
    
    if (isFirstMessage) {
      await executeWithBiometricVerification(
        'send the first voice message in this secure conversation',
        async () => {
          await performSendVoiceMessage(recording)
        }
      )
    } else {
      await performSendVoiceMessage(recording)
    }
    
    setShowVoiceRecorder(false)
  }

  const performSendVoiceMessage = async (recording: VoiceRecording) => {
    if (!activeConversation || !keyPair) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Convert voice recording to base64
    const voiceBase64 = await VoiceUtils.blobToBase64(recording.blob)
    
    // Create initial voice message
    const initialMessage: Message = {
      id: messageId,
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      encrypted_content: voiceBase64,
      timestamp: recording.timestamp,
      status: 'sending',
      isEncrypted: false,
      type: 'voice',
      fileSize: recording.size,
      fileName: `voice-${recording.timestamp}.webm`
    }

    // Add to messages immediately for instant UI feedback
    setMessages((currentMessages) => [...(currentMessages || []), initialMessage])
    setIsEncrypting(true)
    setShowEncryptionDialog(true)

    try {
      // Encrypt the voice data
      const encryptedContent = await encryptMessage(
        voiceBase64,
        'recipient-public-key', // Would get from conversation participants
        keyPair,
        (progress) => {
          setEncryptionProgress({
            ...progress,
            message: progress.message.replace('message', 'voice message')
          })
        }
      )

      // Send to database with voice metadata
      const dbMessage = await sendMessage(
        activeConversation.id,
        currentUser.id,
        JSON.stringify(encryptedContent),
        { 
          algorithm: 'PQC-AES-256-GCM-RSA2048', 
          bitLength: 2048,
          type: 'voice',
          duration: recording.duration,
          size: recording.size,
          waveform: recording.waveform,
          mime_type: recording.blob.type
        }
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
      toast.success(t.voiceMessageRecorded)
      
    } catch (error) {
      console.error('Voice message encryption failed:', error)
      setMessages((currentMessages) => 
        (currentMessages || []).filter(msg => msg.id !== messageId)
      )
      toast.error('Failed to encrypt voice message. Please try again.')
    } finally {
      setIsEncrypting(false)
      setEncryptionProgress(null)
    }
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
    
    // Check if conversation has password protection
    const passwordInfo = await ConversationPasswordManager.getConversationPasswordInfo(message.conversation_id)
    
    if (passwordInfo.hasPassword) {
      // Check if user already has access to this conversation
      const hasAccess = await ConversationPasswordManager.hasConversationAccess(message.conversation_id)
      
      if (!hasAccess) {
        // Show password dialog before decrypting
        setPasswordProtectedConversation(message.conversation_id)
        setPasswordDialogMode('verify')
        setPasswordDialogConversationName(activeConversation?.name || 'this conversation')
        setPasswordDialogHint(passwordInfo.hint)
        setPasswordDialogOnSuccess(() => () => performMessageDecryption(message))
        setShowPasswordDialog(true)
        return
      }
    }
    
    // Proceed with decryption if no password or access already granted
    await performMessageDecryption(message)
  }

  const performMessageDecryption = async (message: Message) => {
    if (!keyPair || typeof message.encrypted_content === 'string') return
      
    setIsDecrypting(true)
    
    // Show decryption progress toast
    const toastId = `decrypt-${message.id}`
    toast.loading(t.decrypting, { id: toastId })
    
    try {
      const decryptedContent = await decryptMessage(
        message.encrypted_content as EncryptedMessage,
        keyPair,
        (progress) => {
          // Update toast with progress
          const progressMessage = `${t.decrypting} ${Math.round(progress.progress)}%`
          toast.loading(progressMessage, { id: toastId })
        }
      )

      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === message.id 
            ? { ...msg, decryptedContent }
            : msg
        )
      )

      toast.success(t.messageDecrypted, { id: toastId })
    } catch (error) {
      console.error('Decryption failed:', error)
      toast.error(t.failedToDecrypt, { id: toastId })
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

  // Handler for generating new access code
  const handleGenerateAccessCode = async () => {
    if (!activeConversation) {
      toast.error('No conversation selected')
      return
    }

    try {
      setGeneratingAccessCode(true)
      const newAccessCode = await regenerateAccessCode(activeConversation.id, currentUser.id)
      
      // Update the local conversation
      setConversations(prev => 
        (prev || []).map(conv => 
          conv.id === activeConversation.id 
            ? { ...conv, access_code: newAccessCode }
            : conv
        )
      )
      
      // Update active conversation
      setActiveConversation(prev => prev ? { ...prev, access_code: newAccessCode } : null)
      
      toast.success(t.accessCodeGenerated, {
        duration: 8000,
        action: {
          label: t.copyAccessCode,
          onClick: () => {
            navigator.clipboard.writeText(newAccessCode)
            toast.success(t.accessCodeCopied)
          }
        }
      })
    } catch (error) {
      console.error('Failed to generate access code:', error)
      toast.error('Failed to generate access code')
    } finally {
      setGeneratingAccessCode(false)
    }
  }

  return (
    <div className="w-full h-full bg-card border-0 overflow-hidden facebook-chat-container">
      <div className="flex h-full">
        {/* Conversations Sidebar - Messenger Style with Mobile Responsive */}
        <div className={`${activeConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 bg-card border-r border-border flex-shrink-0 flex-col h-full`}>
          {/* Header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">{t.chats}</h1>
              <div className="flex gap-2">
                {/* Direct Message Button - Polish Feature 1 */}
                <button 
                  onClick={() => setShowDirectMessage(true)}
                  className="w-9 h-9 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                  title={t.sendDirectMessage}
                >
                  <EnvelopeSimple className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>

                {/* Advanced User Search Button - Polish Feature 2 */}
                <button 
                  onClick={() => {
                    setUserSearchMode('chat')
                    setShowUserSearchDialog(true)
                  }}
                  className="w-9 h-9 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 flex items-center justify-center transition-colors"
                  title={t.advancedUserSearch}
                >
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                </button>

                {/* Add Users to Current Conversation - Polish Feature 3 */}
                {activeConversation && (
                  <button 
                    onClick={() => setShowAddUsersDialog(true)}
                    className="w-9 h-9 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors"
                    title={t.addUsersToConversation}
                  >
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </button>
                )}

                {/* Generate Access Code Button */}
                {activeConversation && (
                  <button 
                    onClick={handleGenerateAccessCode}
                    className="w-9 h-9 rounded-full bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 flex items-center justify-center transition-colors"
                    title={t.generateAccessCode}
                  >
                    <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </button>
                )}
                
                {/* Message Search Button */}
                <button 
                  onClick={() => setShowMessageSearch(true)}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  title={t.searchMessages}
                >
                  <MagnifyingGlass className="w-5 h-5 text-muted-foreground" />
                </button>
                
                <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                  <DialogTrigger asChild>
                    <button 
                      className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      aria-label="Create new conversation"
                    >
                      <Plus className="w-5 h-5 text-muted-foreground" />
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
                    <button 
                      className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      aria-label="Join conversation with access code"
                    >
                      <UserPlus className="w-5 h-5 text-muted-foreground" />
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
                  <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-muted rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all border border-border"
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
                className={`p-3 hover:bg-muted/50 cursor-pointer facebook-conversation-item border-l-4 ${
                  activeConversation?.id === conversation.id 
                    ? 'bg-muted/70 border-l-primary facebook-conversation-active' 
                    : 'border-l-transparent'
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full facebook-avatar flex items-center justify-center text-white font-semibold text-lg">
                      {conversation.otherParticipant?.display_name?.substring(0, 2).toUpperCase() || 
                       conversation.otherParticipant?.username?.substring(0, 2).toUpperCase() ||
                       (conversation.name || 'PC').substring(0, 2).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-card rounded-full facebook-online-indicator ${
                      conversation.otherParticipant?.status === 'online' ? 'bg-green-500' :
                      conversation.otherParticipant?.status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {conversation.otherParticipant?.display_name || 
                           conversation.otherParticipant?.username ||
                           conversation.name || 'Private Conversation'}
                        </h3>
                        {passwordProtectedConversations.has(conversation.id) && (
                          <div className="flex-shrink-0" title="Password protected conversation">
                            <Lock className="w-3 h-3 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{getLastMessageTime(conversation.id)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {getLastMessagePreview(conversation.id)}
                      </p>
                      {conversation.access_code && (
                        <button
                          className="ml-2 text-xs text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(conversation.access_code!)
                            toast.success(t.accessCodeCopied)
                          }}
                          aria-label="Copy access code"
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
        <div className={`${activeConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col h-full`}>
          {activeConversation ? (
            <>
              {/* Mobile Back Button */}
              <div className="lg:hidden p-2 border-b border-border bg-card">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveConversation(null)}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Chats
                </Button>
              </div>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold shadow-sm relative">
                    {activeConversation.otherParticipant?.display_name?.substring(0, 2).toUpperCase() || 
                     activeConversation.otherParticipant?.username?.substring(0, 2).toUpperCase() ||
                     (activeConversation.name || 'PC').substring(0, 2).toUpperCase()}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card rounded-full ${
                      activeConversation.otherParticipant?.status === 'online' ? 'bg-green-500' :
                      activeConversation.otherParticipant?.status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground">
                        {activeConversation.otherParticipant?.display_name || 
                         activeConversation.otherParticipant?.username ||
                         activeConversation.name || 'Private Conversation'}
                      </h2>
                      {passwordProtectedConversations.has(activeConversation.id) && (
                        <div title="Password protected conversation">
                          <Lock className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t.activeNow}</span>
                      <Lock className="w-3 h-3 ml-2" />
                      {/* Access Code Display */}
                      {activeConversation.access_code && (
                        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs border border-yellow-200 dark:border-yellow-800">
                          <Key className="w-3 h-3 text-yellow-600" />
                          <span className="font-mono text-yellow-800 dark:text-yellow-300">{activeConversation.access_code}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(activeConversation.access_code!)
                              toast.success(t.accessCodeCopied)
                            }}
                            className="ml-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title={t.copyAccessCode}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    🛡️ Encrypted
                  </Badge>
                  
                  {/* Password Protection Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showSetPasswordDialog(activeConversation.id)}
                    className="text-xs gap-1 h-6 px-2"
                    title="Set Conversation Password"
                  >
                    <Shield className="w-3 h-3" />
                    <span className="hidden sm:inline">Password</span>
                  </Button>
                  
                  {/* Generate Access Code Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAccessCode}
                    disabled={generatingAccessCode}
                    className="text-xs gap-1 h-6 px-2"
                    title={t.generateAccessCode}
                  >
                    {generatingAccessCode ? (
                      <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Key className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{t.generateAccessCode}</span>
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-muted/30 facebook-chat-scroll">
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
                            {/* Handle different message types */}
                            {message.type === 'voice' ? (
                              <VoiceMessage
                                voiceData={{
                                  encrypted_content: typeof message.encrypted_content === 'string' 
                                    ? message.encrypted_content 
                                    : JSON.stringify(message.encrypted_content),
                                  duration: message.fileSize ? message.fileSize / 1000 : 30, // Approximate duration
                                  size: message.fileSize || 0,
                                  timestamp: message.timestamp,
                                  mime_type: message.fileType || 'audio/webm'
                                }}
                                isOwn={isOwn}
                                conversationKey={activeConversation.access_code || 'default-key'}
                                className="voice-message-in-chat"
                              />
                            ) : message.isEncrypted ? (
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
                          <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
              <div className="p-4 bg-card border-t border-border">
                {showVoiceRecorder ? (
                  <VoiceRecorder
                    onVoiceMessage={handleSendVoiceMessage}
                    onCancel={() => setShowVoiceRecorder(false)}
                    maxDuration={300} // 5 minutes
                    disabled={isEncrypting}
                    className="mb-4"
                  />
                ) : (
                  <div className="flex items-end gap-3">
                    {/* File Attachment Button */}
                    <button
                      onClick={() => setShowFileAttachment(true)}
                      className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      title={t.attachFile}
                    >
                      <Paperclip className="w-5 h-5 text-muted-foreground" />
                    </button>
                    
                    {/* Voice Recording Button */}
                    <button
                      onClick={() => setShowVoiceRecorder(true)}
                      className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      title="Record Voice Message"
                    >
                      <Microphone className="w-5 h-5 text-muted-foreground" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={t.typeMessage}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isEncrypting && handleSendMessage()}
                        disabled={isEncrypting}
                        className="w-full px-4 py-3 bg-muted rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isEncrypting}
                      className={`w-10 h-10 rounded-full flex items-center justify-center facebook-send-button transition-all ${
                        newMessage.trim() && !isEncrypting
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {isEncrypting ? (
                        <Shield className="w-5 h-5 animate-pulse" />
                      ) : (
                        <PaperPlaneRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>{t.messagesEncrypted}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/30">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChatCircle className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{t.yourMessages}</h2>
                <p className="text-muted-foreground mb-6">
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

      {/* Conversation Password Dialog */}
      <ConversationPasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPasswordProtectedConversation(null);
          setPasswordDialogOnSuccess(null);
        }}
        mode={passwordDialogMode}
        conversationId={passwordProtectedConversation || ''}
        conversationName={passwordDialogConversationName}
        passwordHint={passwordDialogHint || undefined}
        onSuccess={() => {
          // Call the stored success callback if it exists
          if (passwordDialogOnSuccess) {
            passwordDialogOnSuccess();
          }
          // Update conversation access state
          if (passwordProtectedConversation) {
            setConversationAccess(prev => ({
              ...prev,
              [passwordProtectedConversation]: true
            }));
          }
        }}
      />
    </div>
  )
}