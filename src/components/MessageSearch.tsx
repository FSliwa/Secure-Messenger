import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  MagnifyingGlass, 
  X, 
  CalendarBlank,
  FunnelSimple,
  Clock,
  User,
  ChatCircle,
  FileText,
  Microphone,
  Image as ImageIcon,
  ArrowRight
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { EncryptedMessage } from '@/lib/crypto'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  senderName: string
  encrypted_content: string | EncryptedMessage
  decryptedContent?: string
  timestamp: number
  status: 'sending' | 'encrypting' | 'sent' | 'delivered' | 'read'
  isEncrypted: boolean
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
  otherParticipant?: {
    id: string
    username: string
    display_name: string | null
  }
}

interface SearchFilters {
  query: string
  type: 'all' | 'text' | 'voice' | 'file' | 'image'
  sender: string
  conversation: string
  dateFrom: Date | null
  dateTo: Date | null
  hasAttachments: boolean | null
}

interface MessageSearchProps {
  messages: Message[]
  conversations: Conversation[]
  currentUser: {
    id: string
    username: string
  }
  isOpen: boolean
  onClose: () => void
  onMessageSelect: (message: Message) => void
}

export function MessageSearch({ 
  messages, 
  conversations, 
  currentUser, 
  isOpen, 
  onClose, 
  onMessageSelect 
}: MessageSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    sender: '',
    conversation: '',
    dateFrom: null,
    dateTo: null,
    hasAttachments: null
  })
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Get unique senders from messages
  const senders = useMemo(() => {
    const uniqueSenders = new Set<string>()
    const sendersList: Array<{ id: string; name: string }> = []
    
    messages.forEach(message => {
      if (!uniqueSenders.has(message.sender_id)) {
        uniqueSenders.add(message.sender_id)
        sendersList.push({
          id: message.sender_id,
          name: message.senderName || (message.sender_id === currentUser.id ? 'You' : 'Unknown')
        })
      }
    })
    
    return sendersList
  }, [messages, currentUser.id])

  // Search and filter messages
  const filteredMessages = useMemo(() => {
    setIsSearching(true)
    
    let filtered = messages

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(message => {
        const content = message.decryptedContent || 
          (typeof message.encrypted_content === 'string' ? message.encrypted_content : '')
        return content.toLowerCase().includes(query) ||
               message.senderName.toLowerCase().includes(query)
      })
    }

    // Message type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(message => message.type === filters.type)
    }

    // Sender filter
    if (filters.sender) {
      filtered = filtered.filter(message => message.sender_id === filters.sender)
    }

    // Conversation filter
    if (filters.conversation) {
      filtered = filtered.filter(message => message.conversation_id === filters.conversation)
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromTime = filters.dateFrom.getTime()
      filtered = filtered.filter(message => message.timestamp >= fromTime)
    }

    if (filters.dateTo) {
      const toTime = filters.dateTo.getTime() + (24 * 60 * 60 * 1000) // End of day
      filtered = filtered.filter(message => message.timestamp <= toTime)
    }

    // Attachments filter
    if (filters.hasAttachments !== null) {
      filtered = filtered.filter(message => {
        const hasAttachment = message.type !== 'text'
        return filters.hasAttachments ? hasAttachment : !hasAttachment
      })
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    setTimeout(() => setIsSearching(false), 100)
    return filtered
  }, [messages, filters])

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      sender: '',
      conversation: '',
      dateFrom: null,
      dateTo: null,
      hasAttachments: null
    })
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />
      case 'voice':
        return <Microphone className="h-4 w-4" />
      case 'file':
        return <FileText className="h-4 w-4" />
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      default:
        return <ChatCircle className="h-4 w-4" />
    }
  }

  const getConversationName = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return 'Unknown Conversation'
    
    if (conversation.is_group) {
      return conversation.name || 'Group Chat'
    }
    
    return conversation.otherParticipant?.display_name || 
           conversation.otherParticipant?.username || 
           'Direct Message'
  }

  const formatMessagePreview = (message: Message) => {
    const content = message.decryptedContent || 
      (typeof message.encrypted_content === 'string' ? message.encrypted_content : '[Encrypted]')
    return content.length > 100 ? content.substring(0, 100) + '...' : content
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.query.trim()) count++
    if (filters.type !== 'all') count++
    if (filters.sender) count++
    if (filters.conversation) count++
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.hasAttachments !== null) count++
    return count
  }, [filters])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlass className="h-5 w-5" />
            Search Messages
          </DialogTitle>
          <DialogDescription>
            Find messages across all your conversations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <FunnelSimple className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}

            {/* Quick type filters */}
            <Select 
              value={filters.type} 
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="image">Images</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sender</label>
                    <Select 
                      value={filters.sender} 
                      onValueChange={(value) => handleFilterChange('sender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All senders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All senders</SelectItem>
                        {senders.map(sender => (
                          <SelectItem key={sender.id} value={sender.id}>
                            {sender.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conversation Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Conversation</label>
                    <Select 
                      value={filters.conversation} 
                      onValueChange={(value) => handleFilterChange('conversation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All conversations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All conversations</SelectItem>
                        {conversations.map(conversation => (
                          <SelectItem key={conversation.id} value={conversation.id}>
                            {getConversationName(conversation.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarBlank className="mr-2 h-4 w-4" />
                          {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom || undefined}
                          onSelect={(date) => handleFilterChange('dateFrom', date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarBlank className="mr-2 h-4 w-4" />
                          {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo || undefined}
                          onSelect={(date) => handleFilterChange('dateTo', date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Results</h3>
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : (
                  <Badge variant="secondary">
                    {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {filters.query.trim() || activeFiltersCount > 0 ? (
                      <>
                        <MagnifyingGlass className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No messages found matching your search criteria</p>
                      </>
                    ) : (
                      <>
                        <ChatCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Start typing to search your messages</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <Card 
                      key={message.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onMessageSelect(message)
                        onClose()
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {getMessageTypeIcon(message.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {message.sender_id === currentUser.id ? 'You' : message.senderName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  in {getConversationName(message.conversation_id)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                              </div>
                            </div>
                            
                            {message.type === 'text' ? (
                              <p className="text-sm text-muted-foreground truncate">
                                {formatMessagePreview(message)}
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {getMessageTypeIcon(message.type)}
                                <span className="capitalize">{message.type} message</span>
                              </div>
                            )}
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}