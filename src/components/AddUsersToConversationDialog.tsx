import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MagnifyingGlass, 
  User,
  UserPlus,
  X,
  Check,
  Users,
  Shield
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

interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  access_code: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface AddUsersToConversationDialogProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
  onUsersAdded?: (users: UserSearchResult[], conversationId: string) => void
}

export function AddUsersToConversationDialog({ 
  isOpen, 
  onClose, 
  conversation,
  currentUser, 
  onUsersAdded 
}: AddUsersToConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchUsers(query, currentUser.id)
      // Filter out users already in selectedUsers
      const filteredResults = results.filter(
        user => !selectedUsers.some(selected => selected.id === user.id)
      )
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Wyszukiwanie nie powiodło się:', error)
      toast.error('Nie udało się wyszukać użytkowników')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddUser = (user: UserSearchResult) => {
    if (selectedUsers.find(u => u.id === user.id)) return
    
    setSelectedUsers(prev => [...prev, user])
    setSearchResults(prev => prev.filter(u => u.id !== user.id))
    toast.success(`Dodano ${user.username} do listy`)
  }

  const handleRemoveUser = (userId: string) => {
    const removedUser = selectedUsers.find(u => u.id === userId)
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
    
    if (removedUser) {
      toast.success(`Usunięto ${removedUser.username} z listy`)
    }
  }

  const handleAddUsersToConversation = async () => {
    if (!conversation || selectedUsers.length === 0) return

    setIsAdding(true)
    try {
      // Simulate adding users to conversation
      // In real implementation, this would call an API to add users to the conversation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onUsersAdded?.(selectedUsers, conversation.id)
      
      toast.success(`Dodano ${selectedUsers.length} użytkowników do konwersacji`)
      
      // Reset state
      setSelectedUsers([])
      setSearchResults([])
      setSearchQuery('')
      onClose()
      
    } catch (error) {
      console.error('Nie udało się dodać użytkowników:', error)
      toast.error('Nie udało się dodać użytkowników do konwersacji')
    } finally {
      setIsAdding(false)
    }
  }

  if (!conversation) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Dodaj uczestników do konwersacji
          </DialogTitle>
          <DialogDescription>
            Znajdź i dodaj nowych użytkowników do konwersacji "{conversation.name || 'Prywatna konwersacja'}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversation Info */}
          <Card className="p-3 bg-accent/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium text-sm">{conversation.name || 'Prywatna konwersacja'}</p>
                <p className="text-xs text-muted-foreground">
                  {conversation.is_group ? 'Konwersacja grupowa' : 'Konwersacja prywatna'} • 
                  ID: {conversation.id.slice(-8)}
                </p>
              </div>
            </div>
          </Card>

          {/* Selected Users Display */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Wybrani użytkownicy ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md max-h-24 overflow-y-auto">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                  >
                    <span>{user.display_name || user.username}</span>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Search */}
          <div>
            <Label htmlFor="search-users">Wyszukaj użytkowników</Label>
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-users"
                placeholder="Wpisz nazwę użytkownika lub nazwę wyświetlaną..."
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
                    onClick={() => handleAddUser(user)}
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
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.status === 'online' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.status === 'online' ? 'Online' : 
                           user.status === 'away' ? 'Zaraz wracam' : 'Offline'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddUser(user)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
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

          {/* Security Notice */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Uwaga o bezpieczeństwie</p>
                <p>Nowi uczestnicy będą mieli dostęp do przyszłych wiadomości, ale nie będą mogli odczytać wcześniejszych zaszyfrowanych wiadomości.</p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={isAdding}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleAddUsersToConversation}
              disabled={selectedUsers.length === 0 || isAdding}
              className="flex-1"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                  Dodawanie...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Dodaj użytkowników ({selectedUsers.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}