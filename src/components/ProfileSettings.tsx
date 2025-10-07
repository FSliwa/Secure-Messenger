import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  User, 
  Camera, 
  Shield, 
  Bell,
  Eye,
  EyeSlash,
  Lock,
  Check,
  X,
  Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: 'online' | 'offline' | 'away'
  privacy_settings: {
    profile_visibility: 'public' | 'friends' | 'private'
    last_seen_visibility: boolean
    read_receipts: boolean
    typing_indicators: boolean
  }
  notification_settings: {
    messages: boolean
    group_invites: boolean
    friend_requests: boolean
    security_alerts: boolean
  }
}

interface ProfileSettingsProps {
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
  isOpen: boolean
  onClose: () => void
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void
}

export function ProfileSettings({ currentUser, isOpen, onClose, onProfileUpdate }: ProfileSettingsProps) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    status: 'online' as 'online' | 'offline' | 'away',
    privacy_settings: {
      profile_visibility: 'friends' as 'public' | 'friends' | 'private',
      last_seen_visibility: true,
      read_receipts: true,
      typing_indicators: true
    },
    notification_settings: {
      messages: true,
      group_invites: true,
      friend_requests: true,
      security_alerts: true
    }
  })

  // Load user profile on open
  useEffect(() => {
    if (isOpen && currentUser.id) {
      loadProfile()
    }
  }, [isOpen, currentUser.id])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error) throw error

      const userProfile: UserProfile = {
        ...data,
        privacy_settings: data.privacy_settings || formData.privacy_settings,
        notification_settings: data.notification_settings || formData.notification_settings
      }

      setProfile(userProfile)
      setFormData({
        username: userProfile.username || '',
        display_name: userProfile.display_name || '',
        bio: userProfile.bio || '',
        status: userProfile.status || 'online',
        privacy_settings: userProfile.privacy_settings,
        notification_settings: userProfile.notification_settings
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error(t.failedToLoadProfile)
    } finally {
      setIsLoading(false)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      setUsernameAvailable(!data)
    } catch (error) {
      // If no user found, username is available
      setUsernameAvailable(true)
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error(t.selectImageFile)
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error(t.fileSizeLimit)
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error(t.failedToUploadAvatar)
      return null
    }
  }

  const handleSave = async () => {
    if (usernameAvailable === false) {
      toast.error(t.usernameNotAvailableError)
      return
    }

    setIsSaving(true)
    try {
      let avatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      const updateData = {
        username: formData.username,
        display_name: formData.display_name || null,
        bio: formData.bio || null,
        avatar_url: avatarUrl,
        status: formData.status,
        privacy_settings: formData.privacy_settings,
        notification_settings: formData.notification_settings,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id)

      if (error) throw error

      toast.success(t.profileUpdated)
      onProfileUpdate(updateData)
      onClose()

    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(t.failedToUpdateProfile)
    } finally {
      setIsSaving(false)
    }
  }

  const getUserInitials = (user: any) => {
    const name = user?.display_name || user?.username || user?.email || 'U'
    return name.charAt(0).toUpperCase()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t.profileSettings}
          </DialogTitle>
          <DialogDescription>
            {t.customizeProfileSettings}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.profilePicture}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview || profile?.avatar_url || ''} />
                    <AvatarFallback className="text-lg">
                      {getUserInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          <Camera className="h-4 w-4" />
                          {t.changePhoto}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.maxFileSize}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.basicInformation}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t.username}</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, username: e.target.value }))
                        checkUsernameAvailability(e.target.value)
                      }}
                      placeholder={t.enterUsername}
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                    {usernameAvailable === true && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {usernameAvailable === false && (
                      <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-500">{t.usernameAlreadyTaken}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Enter display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length}/160 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: 'online' | 'offline' | 'away') => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          Online
                        </div>
                      </SelectItem>
                      <SelectItem value="away">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                          Away
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                          Offline
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Visibility</Label>
                  <Select 
                    value={formData.privacy_settings.profile_visibility} 
                    onValueChange={(value: 'public' | 'friends' | 'private') => 
                      setFormData(prev => ({
                        ...prev,
                        privacy_settings: { ...prev.privacy_settings, profile_visibility: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="last-seen">Show last seen</Label>
                  <Switch
                    id="last-seen"
                    checked={formData.privacy_settings.last_seen_visibility}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        privacy_settings: { ...prev.privacy_settings, last_seen_visibility: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="read-receipts">Read receipts</Label>
                  <Switch
                    id="read-receipts"
                    checked={formData.privacy_settings.read_receipts}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        privacy_settings: { ...prev.privacy_settings, read_receipts: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="typing">Typing indicators</Label>
                  <Switch
                    id="typing"
                    checked={formData.privacy_settings.typing_indicators}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        privacy_settings: { ...prev.privacy_settings, typing_indicators: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="msg-notifications">Message notifications</Label>
                  <Switch
                    id="msg-notifications"
                    checked={formData.notification_settings.messages}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, messages: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="group-invites">Group invites</Label>
                  <Switch
                    id="group-invites"
                    checked={formData.notification_settings.group_invites}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, group_invites: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="friend-requests">Friend requests</Label>
                  <Switch
                    id="friend-requests"
                    checked={formData.notification_settings.friend_requests}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, friend_requests: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="security-alerts">Security alerts</Label>
                  <Switch
                    id="security-alerts"
                    checked={formData.notification_settings.security_alerts}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, security_alerts: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || usernameAvailable === false}
                className="gap-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}