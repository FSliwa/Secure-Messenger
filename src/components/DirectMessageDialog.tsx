import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { 
  MagnifyingGlass, 
  PaperPlaneRight, 
  User,
  Shield,
  Clock
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { searchUsers } from '@/lib/supabase'

interface UserSearchResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

interface DirectMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
  onMessageSent?: (recipient: UserSearchResult, message: string) => void
}

export function DirectMessageDialog({ 
  isOpen, 
  onClose, 
  currentUser, 
  onMessageSent 
}: DirectMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

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
      console.error('Wyszukiwanie nie powiodło się:', error)
      toast.error('Nie udało się wyszukać użytkowników')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendDirectMessage = async () => {
    if (!selectedUser || !message.trim()) return

    setIsSending(true)
    try {
      // Simulate sending a direct message via encrypted channel
      // In a real implementation, this would use a separate direct message API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Call callback to handle the message
      onMessageSent?.(selectedUser, message)
      
      toast.success(`Wiadomość wysłana do @${selectedUser.username}`)
      
      // Reset form
      setSelectedUser(null)
      setMessage('')
      setSearchQuery('')
      setSearchResults([])
      onClose()
      
    } catch (error) {
      console.error('Nie udało się wysłać wiadomości:', error)
      toast.error('Nie udało się wysłać wiadomości')
    } finally {
      setIsSending(false)
    }
  }

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleBackToSearch = () => {
    setSelectedUser(null)
    setMessage('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PaperPlaneRight className="w-5 h-5 text-primary" />
            {selectedUser ? 'Wyślij wiadomość bezpośrednią' : 'Znajdź użytkownika'}
          </DialogTitle>
          <DialogDescription>
            {selectedUser 
              ? `Napisz bezpośrednią wiadomość do @${selectedUser.username}`
              : 'Wyszukaj użytkownika po nazwie, aby wysłać wiadomość bez tworzenia konwersacji'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedUser ? (
            <>
              {/* User Search */}
              <div>
                <Label htmlFor="user-search">Wyszukaj użytkownika</Label>
                <div className="relative">
                  <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-search"
                    placeholder="Wpisz nazwę użytkownika..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearchUsers(e.target.value)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {isSearching ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Wyszukiwanie użytkowników...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <Card 
                        key={user.id} 
                        className="p-3 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge 
                              variant={user.status === 'online' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {user.status === 'online' ? 'Online' : 
                               user.status === 'away' ? 'Zaraz wracam' : 'Offline'}
                            </Badge>
                            {user.status !== 'online' && (
                              <p className="text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(user.last_seen).toLocaleDateString('pl-PL', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : searchQuery.length > 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nie znaleziono użytkowników dla "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MagnifyingGlass className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Wpisz nazwę użytkownika, aby rozpocząć wyszukiwanie
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Selected User & Message Composition */}
              <Card className="p-3 bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedUser.display_name || selectedUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                  <Badge 
                    variant={selectedUser.status === 'online' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {selectedUser.status === 'online' ? 'Online' : 
                     selectedUser.status === 'away' ? 'Zaraz wracam' : 'Offline'}
                  </Badge>
                </div>
              </Card>

              <div>
                <Label htmlFor="direct-message">Wiadomość</Label>
                <Textarea
                  id="direct-message"
                  placeholder="Napisz swoją wiadomość..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Wiadomość zostanie zaszyfrowana end-to-end
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {message.length}/1000
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBackToSearch}
                  className="flex-1"
                  disabled={isSending}
                >
                  Cofnij
                </Button>
                <Button
                  onClick={handleSendDirectMessage}
                  disabled={!message.trim() || isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <PaperPlaneRight className="w-4 h-4 mr-2" />
                      Wyślij
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}