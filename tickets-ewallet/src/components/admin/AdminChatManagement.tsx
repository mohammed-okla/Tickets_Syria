import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, 
  Send, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  FileText,
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  MessageSquare,
  TrendingUp,
  Users,
  Clock3,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { ChatConversation, ChatMessage, ChatFilter } from '@/lib/types'

const AdminChatManagement: React.FC = () => {
  const { user } = useAuth()
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    stats,
    fetchConversations,
    sendMessage,
    setActiveConversation,
    assignConversation,
    updateConversationStatus,
    refreshStats
  } = useChat()

  const [newMessage, setNewMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [filter, setFilter] = useState<ChatFilter>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssignAdmin, setSelectedAssignAdmin] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Apply filters when they change
  useEffect(() => {
    const appliedFilter: ChatFilter = { ...filter }
    if (searchTerm) {
      appliedFilter.search = searchTerm
    }
    fetchConversations(appliedFilter)
  }, [filter, searchTerm, fetchConversations])

  // Handle sending message or internal note
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return

    await sendMessage({
      conversation_id: activeConversation.id,
      content: newMessage.trim(),
      message_type: 'text',
      is_internal: isInternalNote
    })

    setNewMessage('')
    setIsInternalNote(false)
  }

  // Handle assigning conversation
  const handleAssignConversation = async (conversationId: string, adminId: string) => {
    await assignConversation(conversationId, adminId)
  }

  // Handle status change
  const handleStatusChange = async (conversationId: string, status: 'open' | 'assigned' | 'resolved' | 'closed') => {
    await updateConversationStatus(conversationId, status)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500'
      case 'assigned': return 'bg-yellow-500'
      case 'resolved': return 'bg-green-500'
      case 'closed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'normal': return 'bg-blue-500 text-white'
      case 'low': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Conversations</p>
                <p className="text-2xl font-bold">{stats?.total_conversations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock3 className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Open & Assigned</p>
                <p className="text-2xl font-bold">
                  {(stats?.open_conversations || 0) + (stats?.assigned_conversations || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Resolved Today</p>
                <p className="text-2xl font-bold">{stats?.resolved_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-2xl font-bold">{stats?.average_response_time || 0}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex h-[700px] gap-6">
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search conversations..."
                    className="pl-8 h-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select 
                  value={filter.status?.[0] || 'all'} 
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, status: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, status: [value as any] }))
                    }
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select 
                  value={filter.priority?.[0] || 'all'} 
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, priority: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, priority: [value as any] }))
                    }
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select 
                  value={filter.category?.[0] || 'all'} 
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, category: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, category: [value] }))
                    }
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Conversations List */}
          <ScrollArea className="h-[calc(100%-200px)]">
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations found</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <Card 
                    key={conversation.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      activeConversation?.id === conversation.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setActiveConversation(conversation)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{conversation.subject}</h4>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </Badge>
                        {conversation.category && (
                          <Badge variant="secondary" className="text-xs">
                            {conversation.category}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          {conversation.user?.full_name || 'Unknown User'}
                        </div>
                        {conversation.assigned_admin && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <UserPlus className="h-3 w-3 mr-1" />
                            Assigned to {conversation.assigned_admin.full_name}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatMessageTime(conversation.updated_at)}
                        </div>
                      </div>
                      {conversation.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conversation.last_message.content}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{activeConversation.subject}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(activeConversation.status)}>
                        {activeConversation.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(activeConversation.priority)}>
                        {activeConversation.priority}
                      </Badge>
                      {activeConversation.category && (
                        <Badge variant="secondary">
                          {activeConversation.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {activeConversation.user?.full_name || 'Unknown User'}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-4 w-4" />
                      {activeConversation.user?.email}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-4 w-4" />
                      Created {formatMessageTime(activeConversation.created_at)}
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedAssignAdmin} 
                    onValueChange={setSelectedAssignAdmin}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Assign to admin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassign</SelectItem>
                      <SelectItem value={user.id}>Assign to me</SelectItem>
                      {/* Add other admins here if needed */}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={() => handleAssignConversation(activeConversation.id, selectedAssignAdmin)}
                    disabled={!selectedAssignAdmin}
                  >
                    Assign
                  </Button>
                  
                  <Select 
                    value={activeConversation.status} 
                    onValueChange={(value: any) => handleStatusChange(activeConversation.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[70%] ${
                        message.sender_id === user.id ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender?.avatar_url} />
                          <AvatarFallback>
                            {message.sender?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg p-3 ${
                          message.is_internal
                            ? 'bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500'
                            : message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.sender?.full_name || 'Unknown User'}
                            </span>
                            {message.sender?.role === 'admin' && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                            {message.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                Internal Note
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.is_internal
                              ? 'text-yellow-700 dark:text-yellow-300'
                              : message.sender_id === user.id 
                                ? 'text-primary-foreground/70' 
                                : 'text-muted-foreground'
                          }`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="internal" 
                    checked={isInternalNote}
                    onCheckedChange={(checked) => setIsInternalNote(checked === true)}
                  />
                  <Label htmlFor="internal" className="text-sm">
                    Internal note (not visible to user)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder={isInternalNote ? "Add internal note..." : "Type your response..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={loading}
                    rows={2}
                  />
                  <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to start managing it
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminChatManagement