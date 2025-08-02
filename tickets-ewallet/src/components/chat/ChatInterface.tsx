import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  FileText
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { CreateChatRequest, ChatConversation, ChatMessage } from '@/lib/types'

const ChatInterface: React.FC = () => {
  const { user } = useAuth()
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    fetchConversations,
    createConversation,
    sendMessage,
    setActiveConversation
  } = useChat()

  const [newMessage, setNewMessage] = useState('')
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatForm, setNewChatForm] = useState<CreateChatRequest>({
    subject: '',
    initial_message: '',
    category: 'general',
    priority: 'normal'
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle creating new conversation
  const handleCreateConversation = async () => {
    if (!newChatForm.subject.trim() || !newChatForm.initial_message.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    const conversationId = await createConversation(newChatForm)
    if (conversationId) {
      setShowNewChatDialog(false)
      setNewChatForm({
        subject: '',
        initial_message: '',
        category: 'general',
        priority: 'normal'
      })
      
      // Find and set the new conversation as active
      setTimeout(() => {
        const newConversation = conversations.find(c => c.id === conversationId)
        if (newConversation) {
          setActiveConversation(newConversation)
        }
      }, 1000)
    }
  }

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return

    await sendMessage({
      conversation_id: activeConversation.id,
      content: newMessage.trim(),
      message_type: 'text'
    })

    setNewMessage('')
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
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'normal': return 'bg-blue-500'
      case 'low': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access support chat</p>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] gap-4">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Support Conversations</h2>
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Support Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={newChatForm.subject}
                      onChange={(e) => setNewChatForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newChatForm.category} 
                      onValueChange={(value) => setNewChatForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Support</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="account">Account Management</SelectItem>
                        <SelectItem value="refund">Refund Request</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newChatForm.priority} 
                      onValueChange={(value: any) => setNewChatForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="message">Initial Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      value={newChatForm.initial_message}
                      onChange={(e) => setNewChatForm(prev => ({ ...prev, initial_message: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConversation} disabled={loading}>
                      {loading ? 'Creating...' : 'Start Conversation'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="p-4 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No conversations yet</p>
                <Button onClick={() => setShowNewChatDialog(true)} size="sm">
                  Start your first conversation
                </Button>
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
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-xs ${getStatusColor(conversation.status)}`}>
                        {conversation.status}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(conversation.priority)}`}>
                        {conversation.priority}
                      </Badge>
                      {conversation.category && (
                        <Badge variant="secondary" className="text-xs">
                          {conversation.category}
                        </Badge>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {conversation.last_message.content}
                      </p>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatMessageTime(conversation.updated_at)}
                    </div>
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
            <div className="p-4 border-b">
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
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {formatMessageTime(activeConversation.created_at)}
                  </div>
                  {activeConversation.assigned_admin && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-4 w-4" />
                      Assigned to {activeConversation.assigned_admin.full_name}
                    </div>
                  )}
                </div>
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
                        message.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender?.full_name || 'Unknown User'}
                          </span>
                          {message.sender?.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">
                              Support
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === user.id 
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
            <div className="p-4 border-t">
              {activeConversation.status === 'closed' ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">This conversation has been closed</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={loading}
                  />
                  <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose a conversation from the sidebar to start chatting
              </p>
              <Button onClick={() => setShowNewChatDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface