import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  MessageSquare, 
  Edit3, 
  Eye, 
  Send, 
  UserPlus,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  Bell,
  BellOff,
  Settings,
  Clock,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  FileText,
  Image,
  Link,
  Smile,
  Paperclip,
  Download,
  Copy,
  Star,
  Flag,
  MoreHorizontal
} from 'lucide-react'

import { securityContextService } from '@/services/security/SecurityContextService'
import { notificationService } from '@/services/notifications/NotificationService'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'away' | 'offline'
  role: 'owner' | 'editor' | 'viewer'
  cursor?: {
    x: number
    y: number
    text: string
  }
  lastSeen?: string
}

interface Message {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp: string
  type: 'text' | 'file' | 'image' | 'link'
  metadata?: {
    fileName?: string
    fileSize?: number
    fileUrl?: string
    linkUrl?: string
    linkTitle?: string
  }
  reactions?: Array<{
    emoji: string
    users: string[]
  }>
  isEdited?: boolean
  editedAt?: string
}

interface CollaborationSession {
  id: string
  name: string
  description: string
  content: string
  participants: User[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  permissions: {
    canEdit: boolean
    canShare: boolean
    canInvite: boolean
    isLocked: boolean
  }
  settings: {
    allowGuests: boolean
    requireApproval: boolean
    autoSave: boolean
    saveInterval: number
  }
}

interface RealTimeCursor {
  userId: string
  userName: string
  position: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  color: string
}

interface FileShare {
  id: string
  fileName: string
  fileSize: number
  fileUrl: string
  uploadedBy: string
  uploadedAt: string
  type: string
}

export function RealTimeCollaboration({ 
  userId, 
  sessionId, 
  onSessionChange 
}: { 
  userId: string
  sessionId: string
  onSessionChange?: (session: CollaborationSession) => void 
}) {
  const [session, setSession] = useState<CollaborationSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [participants, setParticipants] = useState<User[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [cursors, setCursors] = useState<RealTimeCursor[]>([])
  const [sharedFiles, setSharedFiles] = useState<FileShare[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadCollaborationSession()
    setupRealtimeConnection()
    
    return () => {
      cleanupRealtimeConnection()
    }
  }, [userId, sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadCollaborationSession = async () => {
    try {
      // Mock implementation - would integrate with actual collaboration service
      const mockSession: CollaborationSession = {
        id: sessionId,
        name: 'Q1 Marketing Campaign Planning',
        description: 'Collaborative planning for Q1 2024 marketing campaigns',
        content: '# Q1 Marketing Campaign Planning\n\n## Objectives\n- Increase brand awareness by 25%\n- Generate 500 qualified leads\n- Launch 3 new product campaigns\n\n## Timeline\n\n### January\n- [ ] Campaign strategy development\n- [ ] Creative asset production\n- [ ] Budget allocation\n\n### February\n- [ ] Campaign launch\n- [ ] Performance monitoring\n- [ ] A/B testing\n\n### March\n- [ ] Campaign optimization\n- [ ] Results analysis\n- [ ] Q2 planning',
        participants: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@company.com',
            avatar: '/avatars/john.jpg',
            status: 'online',
            role: 'owner',
            lastSeen: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@company.com',
            avatar: '/avatars/jane.jpg',
            status: 'online',
            role: 'editor',
            lastSeen: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Mike Johnson',
            email: 'mike@company.com',
            avatar: '/avatars/mike.jpg',
            status: 'away',
            role: 'viewer',
            lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString()
          }
        ],
        isActive: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        permissions: {
          canEdit: true,
          canShare: true,
          canInvite: true,
          isLocked: false
        },
        settings: {
          allowGuests: false,
          requireApproval: true,
          autoSave: true,
          saveInterval: 30
        }
      }

      setSession(mockSession)
      setParticipants(mockSession.participants)
      setActiveUsers(mockSession.participants.filter(p => p.status === 'online'))
      setContent(mockSession.content)
      
      if (onSessionChange) {
        onSessionChange(mockSession)
      }

      // Load initial messages
      const mockMessages: Message[] = [
        {
          id: '1',
          userId: '1',
          userName: 'John Doe',
          userAvatar: '/avatars/john.jpg',
          content: 'Welcome everyone! Let\'s start planning our Q1 campaigns.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          type: 'text'
        },
        {
          id: '2',
          userId: '2',
          userName: 'Jane Smith',
          userAvatar: '/avatars/jane.jpg',
          content: 'Great! I\'ve prepared some initial ideas for the brand awareness campaign.',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          type: 'text'
        },
        {
          id: '3',
          userId: '2',
          userName: 'Jane Smith',
          userAvatar: '/avatars/jane.jpg',
          content: 'Check out this campaign brief I found: https://example.com/campaign-brief',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'link',
          metadata: {
            linkUrl: 'https://example.com/campaign-brief',
            linkTitle: 'Q1 Campaign Brief'
          }
        }
      ]

      setMessages(mockMessages)
    } catch (error) {
      console.error('Failed to load collaboration session:', error)
    }
  }

  const setupRealtimeConnection = () => {
    // Mock WebSocket connection - would integrate with actual WebSocket service
    setIsConnected(true)
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Simulate cursor movements
      const mockCursors: RealTimeCursor[] = [
        {
          userId: '2',
          userName: 'Jane Smith',
          position: { line: 5, column: 12 },
          color: '#3b82f6'
        },
        {
          userId: '3',
          userName: 'Mike Johnson',
          position: { line: 8, column: 8 },
          color: '#10b981'
        }
      ]
      setCursors(mockCursors)
    }, 2000)

    return () => clearInterval(interval)
  }

  const cleanupRealtimeConnection = () => {
    setIsConnected(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      userId: userId,
      userName: 'Current User',
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')
    setTypingUsers(prev => prev.filter(id => id !== userId))

    // Notify other participants
    await notificationService.sendMilestoneNotification(
      'New Message in Collaboration',
      `${message.userName} sent a message in ${session?.name}`,
      [message.content.substring(0, 100)]
    )
  }

  const handleContentChange = async (newContent: string) => {
    setContent(newContent)
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true)
      setTypingUsers(prev => [...prev, userId])
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setTypingUsers(prev => prev.filter(id => id !== userId))
    }, 1000)

    // Auto-save functionality
    if (session?.settings.autoSave) {
      const saveTimeout = setTimeout(async () => {
        await saveContent(newContent)
      }, session.settings.saveInterval * 1000)

      return () => clearTimeout(saveTimeout)
    }
  }

  const saveContent = async (contentToSave: string) => {
    try {
      // Mock save operation - would integrate with actual service
      console.log('Saving content:', contentToSave)
      setLastSaved(new Date())
      
      await notificationService.sendMilestoneNotification(
        'Content Auto-Saved',
        `Collaboration session "${session?.name}" auto-saved`,
        [`Saved at: ${new Date().toLocaleString()}`]
      )
    } catch (error) {
      console.error('Failed to save content:', error)
    }
  }

  const handleInviteUser = async (email: string) => {
    try {
      // Mock invite operation - would integrate with actual service
      const newUser: User = {
        id: Date.now().toString(),
        name: email.split('@')[0],
        email: email,
        status: 'offline',
        role: 'viewer'
      }

      setParticipants(prev => [...prev, newUser])
      
      await notificationService.sendMilestoneNotification(
        'User Invited to Collaboration',
        `Invited ${email} to join "${session?.name}"`,
        [`Session: ${session?.name}`, `Role: Viewer`]
      )
    } catch (error) {
      console.error('Failed to invite user:', error)
    }
  }

  const handleShareFile = async (file: File) => {
    try {
      // Mock file upload - would integrate with actual storage service
      const fileShare: FileShare = {
        id: Date.now().toString(),
        fileName: file.name,
        fileSize: file.size,
        fileUrl: URL.createObjectURL(file),
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        type: file.type
      }

      setSharedFiles(prev => [...prev, fileShare])

      const fileMessage: Message = {
        id: Date.now().toString(),
        userId: userId,
        userName: 'Current User',
        content: `Shared file: ${file.name}`,
        timestamp: new Date().toISOString(),
        type: 'file',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileShare.fileUrl
        }
      }

      setMessages(prev => [...prev, fileMessage])
    } catch (error) {
      console.error('Failed to share file:', error)
    }
  }

  const toggleVideoCall = () => {
    setIsVideoCallActive(!isVideoCallActive)
    // Mock video call functionality - would integrate with actual WebRTC service
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium">Loading Collaboration Session</h3>
          <p className="text-gray-500">Setting up your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold">{session.name}</h1>
                <p className="text-sm text-gray-500">{session.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {lastSaved && (
                <div className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                <Users className="h-4 w-4 mr-2" />
                {participants.length}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              
              <Button variant="outline" size="sm" onClick={toggleVideoCall}>
                <Video className="h-4 w-4 mr-2" />
                {isVideoCallActive ? 'End Call' : 'Start Call'}
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm border h-full">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    <span className="font-medium">Document Editor</span>
                    {session.permissions.isLocked && (
                      <Lock className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeUsers.length > 0 && (
                      <div className="flex -space-x-2">
                        {activeUsers.slice(0, 3).map((user) => (
                          <Avatar key={user.id} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {activeUsers.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs">+{activeUsers.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <Textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start collaborating on your document..."
                  className="min-h-[400px] resize-none border-0 focus:ring-0"
                  disabled={session.permissions.isLocked}
                />
                
                {/* Real-time cursors */}
                {cursors.map((cursor) => (
                  <div
                    key={cursor.userId}
                    className="absolute text-xs px-1 rounded"
                    style={{
                      backgroundColor: cursor.color + '20',
                      borderLeft: `2px solid ${cursor.color}`,
                      color: cursor.color
                    }}
                  >
                    {cursor.userName}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Participants Panel */}
          {showParticipants && (
            <div className="w-80 border-l bg-white">
              <div className="p-4 border-b">
                <h3 className="font-medium">Participants ({participants.length})</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback>
                              {participant.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(participant.status)}`} />
                        </div>
                        <div>
                          <div className="font-medium">{participant.name}</div>
                          <div className="text-sm text-gray-500">{participant.email}</div>
                        </div>
                      </div>
                      <Badge className={getRoleColor(participant.role)}>
                        {participant.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleInviteUser('newuser@example.com')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div className="w-80 border-l bg-white flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-medium">Chat</h3>
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {typingUsers.join(', ')} is typing...
                  </div>
                )}
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.userAvatar} />
                        <AvatarFallback>
                          {message.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{message.userName}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {message.type === 'text' && (
                          <div className="bg-gray-100 rounded-lg p-3">
                            {message.content}
                          </div>
                        )}
                        
                        {message.type === 'link' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Link className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{message.metadata?.linkTitle}</span>
                            </div>
                            <a 
                              href={message.metadata?.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline"
                            >
                              {message.metadata?.linkUrl}
                            </a>
                          </div>
                        )}
                        
                        {message.type === 'file' && (
                          <div className="bg-gray-50 border rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-gray-600" />
                              <div className="flex-1">
                                <div className="font-medium">{message.metadata?.fileName}</div>
                                <div className="text-sm text-gray-500">
                                  {message.metadata?.fileSize && 
                                    `${(message.metadata.fileSize / 1024).toFixed(1)} KB`
                                  }
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
