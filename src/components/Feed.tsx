import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Heart, 
  ChatCircle, 
  ShareNetwork, 
  DotsThree,
  Image as ImageIcon,
  Smiley,
  PaperPlaneRight
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

interface Post {
  id: string
  userId: string
  username: string
  displayName: string
  content: string
  imageUrl?: string
  timestamp: number
  likes: number
  comments: number
  shares: number
  isLiked: boolean
}

interface FeedProps {
  currentUser: {
    id: string
    username: string
    displayName?: string
  }
}

export function Feed({ currentUser }: FeedProps) {
  const { t } = useLanguage()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [showComments, setShowComments] = useState<string | null>(null)

  // Mock data - w przyszłości zamień na Supabase
  useEffect(() => {
    const mockPosts: Post[] = [
      {
        id: '1',
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName || currentUser.username,
        content: 'Witajcie! To mój pierwszy post w nowym komunikatorze 🚀',
        timestamp: Date.now() - 3600000,
        likes: 5,
        comments: 2,
        shares: 1,
        isLiked: false
      },
      {
        id: '2',
        userId: 'other-user',
        username: 'jan_kowalski',
        displayName: 'Jan Kowalski',
        content: 'Bezpieczne szyfrowanie end-to-end to podstawa! 🔐',
        timestamp: Date.now() - 7200000,
        likes: 12,
        comments: 4,
        shares: 3,
        isLiked: true
      }
    ]
    setPosts(mockPosts)
  }, [])

  const handleCreatePost = () => {
    if (!newPost.trim()) return

    const post: Post = {
      id: `post_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      content: newPost,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false
    }

    setPosts([post, ...posts])
    setNewPost('')
    toast.success('Post został opublikowany!')
  }

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        }
      }
      return post
    }))
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Teraz'
    if (minutes < 60) return `${minutes} min`
    if (hours < 24) return `${hours} godz`
    return `${days} dni`
  }

  return (
    <div className="flex h-full">
      {/* Main Feed */}
      <div className="flex-1 max-w-2xl mx-auto border-r border-l border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold text-foreground">Feed</h1>
          </div>
        </div>

        {/* Create Post */}
        <div className="border-b border-border p-4">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-lg flex-shrink-0">
              {currentUser.displayName?.substring(0, 2).toUpperCase() || 
               currentUser.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                placeholder="Co się dzieje?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none resize-none text-lg placeholder:text-muted-foreground min-h-[80px]"
                maxLength={280}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </button>
                  <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                    <Smiley className="w-5 h-5 text-primary" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {newPost.length}/280
                  </span>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim()}
                    className="rounded-full"
                    size="sm"
                  >
                    Opublikuj
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border-b border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {post.displayName.substring(0, 2).toUpperCase()}
                </div>

                {/* Post Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground hover:underline cursor-pointer">
                        {post.displayName}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        @{post.username}
                      </span>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="text-muted-foreground text-sm">
                        {formatTime(post.timestamp)}
                      </span>
                    </div>
                    <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                      <DotsThree className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Content */}
                  <p className="text-foreground mb-3 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Image if exists */}
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="rounded-2xl mb-3 max-h-96 w-full object-cover"
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between max-w-md mt-3">
                    <button
                      onClick={() => setShowComments(post.id)}
                      className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
                    >
                      <div className="p-2 group-hover:bg-blue-500/10 rounded-full transition-colors">
                        <ChatCircle className="w-5 h-5" />
                      </div>
                      <span className="text-sm">{post.comments}</span>
                    </button>

                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors group ${
                        post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${
                        post.isLiked ? 'bg-red-500/10' : 'group-hover:bg-red-500/10'
                      }`}>
                        <Heart className="w-5 h-5" weight={post.isLiked ? 'fill' : 'regular'} />
                      </div>
                      <span className="text-sm">{post.likes}</span>
                    </button>

                    <button className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group">
                      <div className="p-2 group-hover:bg-green-500/10 rounded-full transition-colors">
                        <ShareNetwork className="w-5 h-5" />
                      </div>
                      <span className="text-sm">{post.shares}</span>
                    </button>

                    <button className="p-2 text-muted-foreground hover:bg-primary/10 rounded-full transition-colors">
                      <PaperPlaneRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Right Sidebar - Trending */}
      <div className="hidden xl:block w-80 p-4">
        <div className="sticky top-4">
          <Card className="p-4 mb-4">
            <h2 className="text-xl font-bold mb-4">Co jest grane?</h2>
            <div className="space-y-4">
              {[
                { topic: 'Bezpieczeństwo', posts: '1.2K postów' },
                { topic: 'Szyfrowanie E2E', posts: '845 postów' },
                { topic: 'Prywatność', posts: '623 postów' }
              ].map((trend, i) => (
                <div
                  key={i}
                  className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                >
                  <div className="text-sm text-muted-foreground">Popularne</div>
                  <div className="font-semibold">#{trend.topic}</div>
                  <div className="text-sm text-muted-foreground">{trend.posts}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Kogo obserwować</h2>
            <div className="space-y-4">
              {[
                { name: 'Jan Kowalski', username: 'jan_kowalski' },
                { name: 'Anna Nowak', username: 'anna_n' },
                { name: 'Piotr Wiśniewski', username: 'piotr_w' }
              ].map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">
                    Obserwuj
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
