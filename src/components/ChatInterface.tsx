import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  Key
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
import { VoiceMessage } from './VoiceMessage'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string | EncryptedMessage
  timestamp: number
  status: 'sending' | 'encrypting' | 'sent' | 'delivered' | 'read'
  isEncrypted: boolean
  decryptedContent?: string
  type: 'text' | 'voice' | 'file'
  voiceData?: {
    blob: Blob
    duration: number
    audioURL?: string
  }
}

interface Contact {
  id: string
  name: string
  publicKey: string
  lastSeen: number
  isOnline: boolean
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
  const [contacts, setContacts] = useKV<Contact[]>('chat-contacts', [])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState<EncryptionProgress | null>(null)
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadKeys = async () => {
      const keys = await getStoredKeys()
      setKeyPair(keys)
    }
    loadKeys()
  }, [])

  useEffect(() => {
    // Initialize some demo contacts if none exist
    if (!contacts?.length) {
      const demoContacts: Contact[] = [
        {
          id: 'alice',
          name: 'Alice Johnson',
          publicKey: 'demo-public-key-alice',
          lastSeen: Date.now() - 300000, // 5 minutes ago
          isOnline: true
        },
        {
          id: 'bob',
          name: 'Bob Smith',
          publicKey: 'demo-public-key-bob',
          lastSeen: Date.now() - 3600000, // 1 hour ago
          isOnline: false
        },
        {
          id: 'carol',
          name: 'Carol Williams',
          publicKey: 'demo-public-key-carol',
          lastSeen: Date.now() - 120000, // 2 minutes ago
          isOnline: true
        }
      ]
      setContacts(demoContacts)
    }
  }, [contacts, setContacts])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeContact || !keyPair) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create initial message
    const initialMessage: Message = {
      id: messageId,
      senderId: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      content: newMessage,
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
        activeContact.publicKey,
        keyPair,
        (progress) => {
          setEncryptionProgress(progress)
        }
      )

      // Update message with encrypted content
      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: encryptedContent, 
                status: 'sent', 
                isEncrypted: true 
              }
            : msg
        )
      )

      setShowEncryptionDialog(false)
      toast.success('Message encrypted and sent securely!')

      // Simulate message delivery
      setTimeout(() => {
        setMessages((currentMessages) => 
          (currentMessages || []).map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'delivered' }
              : msg
          )
        )
      }, 2000)

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

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!activeContact || !keyPair) return

    const messageId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const audioURL = URL.createObjectURL(audioBlob)
    
    // Create initial voice message
    const initialMessage: Message = {
      id: messageId,
      senderId: currentUser.id,
      senderName: currentUser.displayName || currentUser.username,
      content: '[Voice Message]',
      timestamp: Date.now(),
      status: 'encrypting',
      isEncrypted: false,
      type: 'voice',
      voiceData: {
        blob: audioBlob,
        duration,
        audioURL
      }
    }

    setMessages((currentMessages) => [...(currentMessages || []), initialMessage])
    setIsEncrypting(true)
    setShowEncryptionDialog(true)

    try {
      // Convert audio blob to base64 for encryption
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      
      // Encrypt the voice data
      const encryptedContent = await encryptMessage(
        base64Audio,
        activeContact.publicKey,
        keyPair,
        (progress) => {
          setEncryptionProgress(progress)
        }
      )

      // Update message with encrypted content
      setMessages((currentMessages) => 
        (currentMessages || []).map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: encryptedContent, 
                status: 'sent', 
                isEncrypted: true 
              }
            : msg
        )
      )

      setShowEncryptionDialog(false)
      toast.success('Voice message encrypted and sent securely!')

      // Simulate message delivery
      setTimeout(() => {
        setMessages((currentMessages) => 
          (currentMessages || []).map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'delivered' }
              : msg
          )
        )
      }, 2000)

    } catch (error) {
      console.error('Voice encryption failed:', error)
      setMessages((currentMessages) => 
        (currentMessages || []).filter(msg => msg.id !== messageId)
      )
      toast.error('Failed to encrypt voice message. Please try again.')
      setShowEncryptionDialog(false)
    } finally {
      setIsEncrypting(false)
      setEncryptionProgress(null)
    }
  }

  const handleDecryptMessage = async (message: Message) => {
    if (!keyPair || typeof message.content === 'string') return

    setIsDecrypting(true)
    try {
      const decryptedContent = await decryptMessage(
        message.content as EncryptedMessage,
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
    if (!activeContact) return []
    return messages?.filter(msg => 
      (msg.senderId === currentUser.id && activeContact) ||
      (msg.senderId === activeContact.id)
    ) || []
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
      {/* Contacts Sidebar */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Secure Contacts
          </h2>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-2">
            {contacts?.map((contact) => (
              <Card 
                key={contact.id}
                className={`mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                  activeContact?.id === contact.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setActiveContact(contact)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      {contact.isOnline && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Key className="w-3 h-3" />
                        <span className="truncate">
                          {contact.publicKey.slice(0, 12)}...
                        </span>
                      </div>
                    </div>
                    {contact.isOnline ? (
                      <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                        Online
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {new Date(contact.lastSeen).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{activeContact.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>End-to-end encrypted</span>
                      {activeContact.isOnline && (
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                          Online
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  PQC-4096
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
                      message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderId === currentUser.id
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
                                {typeof message.content === 'object' && message.content.data?.slice(0, 40)}...
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
                        <p className="text-sm">{message.content as string}</p>
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
                <VoiceMessage
                  onSendVoiceMessage={handleSendVoiceMessage}
                  disabled={isEncrypting}
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
                <span>Messages are encrypted with post-quantum cryptography</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a contact</h3>
              <p className="text-muted-foreground">
                Choose someone to start a secure conversation
              </p>
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
              Your message is being secured with post-quantum cryptography.
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