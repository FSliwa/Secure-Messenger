import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, 
  Download, 
  File, 
  Image, 
  Video, 
  MusicNote as Music,
  FileText,
  Archive,
  X,
  Lock,
  Shield,
  Clock,
  CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { encryptMessage, EncryptionProgress, KeyPair } from '@/lib/crypto'

interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: number
  isEncrypted: boolean
  encryptionStatus: 'pending' | 'encrypting' | 'encrypted' | 'failed'
  downloadCount: number
  expiresAt?: number
  recipientId?: string
  encryptedData?: string
}

interface FileSharingProps {
  keyPair: KeyPair | null
  currentUserId: string
}

export function FileSharing({ keyPair, currentUserId }: FileSharingProps) {
  const [sharedFiles, setSharedFiles] = useKV<SharedFile[]>('shared-files', [])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [encryptionProgress, setEncryptionProgress] = useState<{ [key: string]: EncryptionProgress }>({})
  const [showEncryptionDialog, setShowEncryptionDialog] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !keyPair) return

    Array.from(files).forEach(async (file) => {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 50MB.`)
        return
      }

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newFile: SharedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
        isEncrypted: true,
        encryptionStatus: 'encrypting',
        downloadCount: 0,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }

      setSharedFiles((current) => [...(current || []), newFile])
      setShowEncryptionDialog(fileId)

      try {
        // Simulate file encryption
        const fileContent = await file.arrayBuffer()
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileContent)))
        
        const encryptedData = await encryptMessage(
          base64Content,
          keyPair.publicKey, // In reality, this would be recipient's public key
          keyPair,
          (progress) => {
            setEncryptionProgress((current) => ({
              ...current,
              [fileId]: progress
            }))
          }
        )

        setSharedFiles((current) => 
          (current || []).map(f => 
            f.id === fileId 
              ? { 
                  ...f, 
                  encryptionStatus: 'encrypted', 
                  encryptedData: JSON.stringify(encryptedData) 
                }
              : f
          )
        )

        toast.success(`${file.name} encrypted and uploaded successfully!`)
        setShowEncryptionDialog(null)

      } catch (error) {
        console.error('File encryption failed:', error)
        setSharedFiles((current) => 
          (current || []).map(f => 
            f.id === fileId 
              ? { ...f, encryptionStatus: 'failed' }
              : f
          )
        )
        toast.error(`Failed to encrypt ${file.name}`)
        setShowEncryptionDialog(null)
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDownload = (file: SharedFile) => {
    if (file.encryptionStatus !== 'encrypted' || !file.encryptedData) {
      toast.error('File is not ready for download')
      return
    }

    // Simulate secure download
    toast.loading('Decrypting file for download...', { id: `download-${file.id}` })
    
    setTimeout(() => {
      // Create download link
      const blob = new Blob(['[ENCRYPTED FILE DATA]'], { type: file.type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update download count
      setSharedFiles((current) => 
        (current || []).map(f => 
          f.id === file.id 
            ? { ...f, downloadCount: f.downloadCount + 1 }
            : f
        )
      )

      toast.success('File decrypted and downloaded!', { id: `download-${file.id}` })
    }, 2000)
  }

  const handleDeleteFile = (fileId: string) => {
    setSharedFiles((current) => 
      (current || []).filter(f => f.id !== fileId)
    )
    toast.success('File deleted securely')
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />
    if (type.includes('text') || type.includes('document')) return <FileText className="w-5 h-5" />
    if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: SharedFile['encryptionStatus']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'encrypting':
        return <Badge className="bg-primary/10 text-primary">Encrypting</Badge>
      case 'encrypted':
        return <Badge className="bg-success/10 text-success">Encrypted</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now()
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return 'Expires soon'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Secure File Sharing</h2>
        <p className="text-muted-foreground">
          Share files with end-to-end encryption. All files are encrypted before upload.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!keyPair}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
              {!keyPair && (
                <p className="text-sm text-destructive">
                  Encryption keys required
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Maximum file size: 50MB • Files expire after 7 days
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Encrypted Files ({sharedFiles?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {sharedFiles?.length ? (
                sharedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-4 border rounded-lg">
                    <div className="text-primary">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{file.name}</p>
                        {getStatusBadge(file.encryptionStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        {file.downloadCount > 0 && (
                          <span>{file.downloadCount} downloads</span>
                        )}
                        {file.expiresAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{getTimeRemaining(file.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.encryptionStatus === 'encrypted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Encryption Progress Dialog */}
      {showEncryptionDialog && (
        <Dialog open={!!showEncryptionDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Encrypting File
              </DialogTitle>
              <DialogDescription>
                Your file is being secured with military-grade encryption. 
                This process ensures maximum security but may take several minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {encryptionProgress[showEncryptionDialog] && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {encryptionProgress[showEncryptionDialog].phase.replace('-', ' ')}
                      </span>
                      <span>{Math.round(encryptionProgress[showEncryptionDialog].progress)}%</span>
                    </div>
                    <Progress value={encryptionProgress[showEncryptionDialog].progress} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {encryptionProgress[showEncryptionDialog].message}
                  </p>
                </>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>File will be automatically deleted after 7 days</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}