import { useState, useEffect } from 'react'
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
  ChatCircle,
  UserPlus,
  Clock,
  Check
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

interface UserSearchDialogProps {
  isOpen: boolean
  onClose: () => void
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
  onUserSelect?: (user: UserSearchResult, action: 'chat' | 'add') => void
  mode: 'chat' | 'add-to-conversation'
  conversationId?: string
}

export function UserSearchDialog({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUserSelect,
  mode,
  conversationId
}: UserSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  
  // Real-time search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

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

  const handleUserAction = (user: UserSearchResult, action: 'chat' | 'add') => {
    if (mode === 'add-to-conversation') {
      // Toggle selection for adding multiple users
      const newSelection = new Set(selectedUsers)
      if (newSelection.has(user.id)) {
        newSelection.delete(user.id)
        toast.success(`Usunięto ${user.username} z wyboru`)
      } else {
        newSelection.add(user.id)
        toast.success(`Dodano ${user.username} do wyboru`)
      }
      setSelectedUsers(newSelection)
    } else {
      // Direct action for chat mode
      onUserSelect?.(user, action)
      onClose()
    }
  }

  const handleAddSelectedUsers = () => {
    if (selectedUsers.size === 0) return

    const usersToAdd = searchResults.filter(user => selectedUsers.has(user.id))
    
    usersToAdd.forEach(user => {
      onUserSelect?.(user, 'add')
    })

    toast.success(`Dodano ${usersToAdd.length} użytkowników do konwersacji`)
    setSelectedUsers(new Set())
    onClose()
  }

  const getTitle = () => {
    if (mode === 'add-to-conversation') {
      return 'Dodaj użytkowników do konwersacji'
    }
    return 'Wyszukaj użytkowników'
  }

  const getDescription = () => {
    if (mode === 'add-to-conversation') {
      return 'Znajdź i dodaj użytkowników do obecnej konwersacji'
    }
    return 'Wyszukaj użytkowników po nazwie użytkownika lub nazwie wyświetlanej'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlass className="w-5 h-5 text-primary" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Advanced Search Input */}
          <div>
            <Label htmlFor="advanced-user-search">Wyszukaj użytkowników</Label>
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                id="advanced-user-search"
                placeholder="Wpisz @nazwę_użytkownika lub nazwę wyświetlaną..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                Możesz wyszukiwać według nazwy użytkownika (@nazwa) lub pełnej nazwy
              </p>
              {searchResults.length > 0 && !isSearching && (
                <p className="text-xs font-medium text-primary">
                  Znaleziono: {searchResults.length}
                </p>
              )}
            </div>
          </div>

          {/* Selected Users Counter (for add mode) */}
          {mode === 'add-to-conversation' && selectedUsers.size > 0 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Wybrano: {selectedUsers.size} użytkowników
                </p>
                <Button 
                  size="sm" 
                  onClick={handleAddSelectedUsers}
                  className="gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Dodaj do konwersacji
                </Button>
              </div>
            </Card>
          )}

          {/* Search Results */}
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm text-muted-foreground">Wyszukiwanie użytkowników...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Przeszukujemy bazę użytkowników...
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const isSelected = selectedUsers.has(user.id)
                  
                  return (
                    <Card 
                      key={user.id} 
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                      onClick={() => handleUserAction(user, mode === 'add-to-conversation' ? 'add' : 'chat')}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          {/* Online Status Indicator */}
                          {user.status === 'online' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary border-2 border-white rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">
                              {user.display_name || user.username}
                            </p>
                            {user.display_name && (
                              <Badge variant="outline" className="text-xs">
                                Zweryfikowany
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            @{user.username}
                          </p>
                          
                          {/* Status Info */}
                          <div className="flex items-center gap-2 text-xs">
                            <Badge 
                              variant={user.status === 'online' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                user.status === 'online' ? 'bg-green-500' :
                                user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                              }`}></div>
                              {user.status === 'online' ? 'Aktywny' : 
                               user.status === 'away' ? 'Zaraz wracam' : 'Nieaktywny'}
                            </Badge>
                            
                            {user.status !== 'online' && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(user.last_seen).toLocaleDateString('pl-PL', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        {mode === 'chat' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUserAction(user, 'chat')
                              }}
                              className="text-xs px-2"
                            >
                              <ChatCircle className="w-3 h-3 mr-1" />
                              Chat
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })
              ) : searchQuery.length > 0 ? (
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-sm mb-1">Brak wyników</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Nie znaleziono użytkowników dla "<strong>{searchQuery}</strong>"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Spróbuj wyszukać inną nazwę użytkownika lub nazwę wyświetlaną
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MagnifyingGlass className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-sm mb-1">Rozpocznij wyszukiwanie</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Wpisz nazwę użytkownika, aby znaleźć osoby do rozmowy
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Użyj @ przed nazwą użytkownika (np. @jan_kowalski)</p>
                    <p>• Wpisz pełną nazwę wyświetlaną (np. Jan Kowalski)</p>
                    <p>• Wyszukiwanie działa w czasie rzeczywistym</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Anuluj
            </Button>
            {mode === 'add-to-conversation' && selectedUsers.size > 0 && (
              <Button onClick={handleAddSelectedUsers} className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Dodaj ({selectedUsers.size})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}