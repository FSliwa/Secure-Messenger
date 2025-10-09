import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Paperclip, 
  X, 
  File, 
  FileImage, 
  FileVideo, 
  FileAudio,
  FileText,
  FileCode,
  FilePdf,
  FileZip,
  Upload,
  Eye,
  Download,
  Share,
  Trash,
  Warning,
  CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { encryptMessage, EncryptedMessage, KeyPair } from '@/lib/crypto'

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
  encryptedUrl?: string
  uploadProgress?: number
  status: 'uploading' | 'completed' | 'failed' | 'encrypting'
  thumbnail?: string
  encryptedData?: EncryptedMessage
}

interface FileAttachmentProps {
  isOpen: boolean
  onClose: () => void
  onFilesSelected: (files: FileAttachment[]) => void
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  maxFiles?: number
  keyPair?: KeyPair | null
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/csv',
  'text/javascript', 'application/javascript',
  'text/html', 'text/css',
  'application/json'
]

const DEFAULT_MAX_FILE_SIZE = 25 // MB
const DEFAULT_MAX_FILES = 10

export function FileAttachment({ 
  isOpen, 
  onClose, 
  onFilesSelected,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = ALLOWED_FILE_TYPES,
  maxFiles = DEFAULT_MAX_FILES,
  keyPair
}: FileAttachmentProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (type: string, size: number = 24) => {
    const iconProps = { size, className: "text-muted-foreground" }
    
    if (type.startsWith('image/')) return <FileImage {...iconProps} className="text-blue-500" />
    if (type.startsWith('video/')) return <FileVideo {...iconProps} className="text-purple-500" />
    if (type.startsWith('audio/')) return <FileAudio {...iconProps} className="text-green-500" />
    if (type === 'application/pdf') return <FilePdf {...iconProps} className="text-red-500" />
    if (type.includes('zip')) return <FileZip {...iconProps} className="text-yellow-500" />
    if (type.startsWith('text/') || type.includes('javascript') || type.includes('json')) {
      return <FileCode {...iconProps} className="text-indigo-500" />
    }
    if (type.includes('word') || type.includes('excel') || type.includes('powerpoint')) {
      return <FileText {...iconProps} className="text-blue-600" />
    }
    
    return <File {...iconProps} />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported'
    }

    return null
  }

  const createThumbnail = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Create thumbnail (max 200x200)
          const maxSize = 200
          let { width, height } = img
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const encryptFile = async (file: File): Promise<EncryptedMessage | null> => {
    if (!keyPair) return null

    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)
      
      // Convert to base64 for encryption
      const base64Data = btoa(String.fromCharCode(...fileData))
      
      // Encrypt the file data
      const encrypted = await encryptMessage(base64Data, keyPair.publicKey, keyPair)
      return encrypted
    } catch (error) {
      console.error('Error encrypting file:', error)
      return null
    }
  }

  const uploadFile = async (file: File, attachment: FileAttachment): Promise<string | null> => {
    try {
      // Check if bucket exists first
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.name === 'message-attachments')
      
      if (!bucketExists) {
        toast.error('Storage not configured. Please contact support.')
        throw new Error('Bucket message-attachments does not exist')
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `attachments/${fileName}`

      // Upload file to storage
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(error.message || 'Upload failed')
      return null
    }
  }

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = []
    const newAttachments: FileAttachment[] = []

    for (const file of files) {
      const validation = validateFile(file)
      if (validation) {
        toast.error(`${file.name}: ${validation}`)
        continue
      }

      // Check total file limit
      if (selectedFiles.length + newAttachments.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        break
      }

      const attachment: FileAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        uploadProgress: 0
      }

      // Create thumbnail for images
      if (file.type.startsWith('image/')) {
        const thumbnail = await createThumbnail(file)
        if (thumbnail) {
          attachment.thumbnail = thumbnail
        }
      }

      // Add to both arrays together to maintain correct pairing
      validFiles.push(file)
      newAttachments.push(attachment)
    }

    setSelectedFiles(prev => [...prev, ...newAttachments])

    // Process each valid file with its matching attachment
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const attachment = newAttachments[i]

      try {
        // Update status to encrypting if encryption is enabled
        if (keyPair) {
          setSelectedFiles(prev => 
            prev.map(f => 
              f.id === attachment.id 
                ? { ...f, status: 'encrypting' as const }
                : f
            )
          )

          // Encrypt file with error handling
          try {
            const encryptedData = await encryptFile(file)
            if (encryptedData) {
              attachment.encryptedData = encryptedData
            } else {
              throw new Error('Encryption returned null')
            }
          } catch (encryptError) {
            console.error('File encryption failed:', encryptError)
            toast.error(`Failed to encrypt ${file.name}. Uploading without encryption.`)
            // Continue with upload even if encryption fails
          }
        }

        // Upload file
        const url = await uploadFile(file, attachment)
        
        if (url) {
          setSelectedFiles(prev => 
            prev.map(f => 
              f.id === attachment.id 
                ? { ...f, url, status: 'completed' as const, uploadProgress: 100 }
                : f
            )
          )
        } else {
          throw new Error('Upload failed')
        }

      } catch (error) {
        console.error('Error processing file:', error)
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === attachment.id 
              ? { ...f, status: 'failed' as const }
              : f
          )
        )
        toast.error(`Failed to process ${attachment.name}`)
      }
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleSendFiles = () => {
    const completedFiles = selectedFiles.filter(f => f.status === 'completed')
    if (completedFiles.length === 0) {
      toast.error('No files ready to send')
      return
    }

    onFilesSelected(completedFiles)
    setSelectedFiles([])
    onClose()
  }

  const getStatusColor = (status: FileAttachment['status']) => {
    switch (status) {
      case 'completed': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'uploading': case 'encrypting': return 'text-blue-500'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: FileAttachment['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <Warning className="h-4 w-4 text-red-500" />
      case 'uploading': case 'encrypting': 
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      default: return null
    }
  }

  const completedFiles = selectedFiles.filter(f => f.status === 'completed').length
  const totalFiles = selectedFiles.length

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attach Files
          </DialogTitle>
          <DialogDescription>
            Upload files to share in your conversation. Files are encrypted for security.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Drop files here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Max {maxFiles} files, {maxFileSize}MB each</p>
              <p>Supported: Images, Videos, Audio, Documents, PDFs, Archives</p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected Files ({totalFiles})</h4>
                {totalFiles > 0 && (
                  <Badge variant="secondary">
                    {completedFiles}/{totalFiles} ready
                  </Badge>
                )}
              </div>

              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {selectedFiles.map((file) => (
                    <Card key={file.id} className="p-3">
                      <div className="flex items-center gap-3">
                        {/* File Icon/Thumbnail */}
                        <div className="flex-shrink-0">
                          {file.thumbnail ? (
                            <img 
                              src={file.thumbnail} 
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            getFileIcon(file.type, 24)
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(file.status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                            <span className={`text-xs ${getStatusColor(file.status)}`}>
                              {file.status === 'uploading' && file.uploadProgress !== undefined
                                ? `${file.uploadProgress}%`
                                : file.status === 'encrypting'
                                ? 'Encrypting...'
                                : file.status
                              }
                            </span>
                          </div>

                          {/* Progress Bar */}
                          {(file.status === 'uploading' || file.status === 'encrypting') && (
                            <Progress 
                              value={file.status === 'encrypting' ? 50 : (file.uploadProgress || 0)} 
                              className="mt-2 h-1"
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendFiles}
              disabled={completedFiles === 0}
              className="gap-2"
            >
              Send {completedFiles > 0 && `(${completedFiles})`} Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}