import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileVideo, 
  FileAudio, 
  FilePdf,
  FileText,
  Archive,
  Warning,
  Check,
  CloudArrowUp
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationContext'

interface FileUpload {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
  thumbnail?: string
}

interface EnhancedFileSharingProps {
  onFileUpload: (file: File) => Promise<{ url: string; thumbnail?: string }>
  onSendFiles: (files: { url: string; name: string; size: number; type: string; thumbnail?: string }[]) => void
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  maxFiles?: number
}

const DEFAULT_ALLOWED_TYPES = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'text/*',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.7z'
]

export function EnhancedFileSharing({
  onFileUpload,
  onSendFiles,
  maxFileSize = 50, // 50MB default
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxFiles = 10
}: EnhancedFileSharingProps) {
  const { t } = useLanguage()
  const { playNotificationSound } = useNotifications()
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    const name = file.name.toLowerCase()

    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
    if (type.startsWith('video/')) return <FileVideo className="h-8 w-8 text-purple-500" />
    if (type.startsWith('audio/')) return <FileAudio className="h-8 w-8 text-green-500" />
    if (type === 'application/pdf') return <FilePdf className="h-8 w-8 text-red-500" />
    if (type.startsWith('text/') || name.endsWith('.txt')) return <FileText className="h-8 w-8 text-gray-500" />
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return <Archive className="h-8 w-8 text-orange-500" />
    
    return <File className="h-8 w-8 text-gray-400" />
  }

  const formatFileSize = (bytes: number): string => {
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
    const isAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })

    if (!isAllowed) {
      return 'File type not allowed'
    }

    return null
  }

  const generateThumbnail = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(undefined)
            return
          }

          // Calculate thumbnail size (max 200x200)
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
          ctx.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const processFiles = async (fileList: FileList) => {
    const newFiles: FileUpload[] = []
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList[i]
      const error = validateFile(file)
      
      if (error) {
        toast.error(`${file.name}: ${error}`)
        playNotificationSound('error')
        continue
      }

      const fileUpload: FileUpload = {
        id: Date.now() + i + '',
        file,
        progress: 0,
        status: 'pending'
      }

      newFiles.push(fileUpload)
    }

    if (newFiles.length === 0) return

    setFiles(prev => [...prev, ...newFiles])

    // Start uploading files
    for (const fileUpload of newFiles) {
      uploadFile(fileUpload)
    }
  }

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // Generate thumbnail if it's an image
      const thumbnail = await generateThumbnail(fileUpload.file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id && f.progress < 90
            ? { ...f, progress: f.progress + Math.random() * 20 }
            : f
        ))
      }, 100)

      // Upload file
      const result = await onFileUpload(fileUpload.file)
      
      clearInterval(progressInterval)

      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              url: result.url,
              thumbnail: thumbnail || result.thumbnail
            }
          : f
      ))

      playNotificationSound('message')
      
    } catch (error) {
      console.error('File upload error:', error)
      
      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ))

      playNotificationSound('error')
      toast.error(`Failed to upload ${fileUpload.file.name}`)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const sendFiles = () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.url)
    
    if (completedFiles.length === 0) {
      toast.error('No files ready to send')
      return
    }

    const fileData = completedFiles.map(f => ({
      url: f.url!,
      name: f.file.name,
      size: f.file.size,
      type: f.file.type,
      thumbnail: f.thumbnail
    }))

    onSendFiles(fileData)
    setFiles([])
    toast.success(`Sent ${completedFiles.length} file(s)`)
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounterRef.current = 0

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }, [])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const hasCompletedFiles = files.some(f => f.status === 'completed')
  const hasUploadingFiles = files.some(f => f.status === 'uploading')

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CloudArrowUp className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-lg font-medium mb-2">
          {isDragOver ? 'Drop files here!' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or
        </p>
        <Button 
          onClick={handleFileSelect}
          variant="outline"
          className="mb-4"
        >
          <Upload className="h-4 w-4 mr-2" />
          Browse Files
        </Button>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Max file size: {maxFileSize}MB</p>
          <p>Max files: {maxFiles}</p>
          <p>Supported: Images, Videos, Audio, Documents, Archives</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Files ({files.length})</h3>
              {hasCompletedFiles && (
                <Button 
                  onClick={sendFiles}
                  disabled={hasUploadingFiles}
                  size="sm"
                >
                  Send Files
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((fileUpload) => (
                <div key={fileUpload.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(fileUpload.file)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileUpload.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileUpload.file.size)}
                    </p>
                    
                    {/* Progress */}
                    {fileUpload.status === 'uploading' && (
                      <Progress value={fileUpload.progress} className="mt-2 h-1" />
                    )}
                    
                    {/* Error */}
                    {fileUpload.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">
                        {fileUpload.error}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {fileUpload.status === 'pending' && (
                      <Badge variant="secondary">Waiting</Badge>
                    )}
                    {fileUpload.status === 'uploading' && (
                      <Badge variant="secondary">
                        {Math.round(fileUpload.progress)}%
                      </Badge>
                    )}
                    {fileUpload.status === 'completed' && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    {fileUpload.status === 'error' && (
                      <Warning className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileUpload.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}