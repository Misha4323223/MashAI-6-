import { useEffect, useState } from "react";
import { User, MessageWithUser } from "@shared/schema";
import Sidebar from "@/components/chat/sidebar";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import UserRegistration from "@/components/user-registration";
import { useWebSocket } from "@/hooks/use-websocket";
import { useChat } from "@/hooks/use-chat";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, Search, Video, Settings, Users, Bot } from "lucide-react";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAiActive, setIsAiActive] = useState(true);
  const [currentChatType, setCurrentChatType] = useState<"general" | "private">("general");
  const queryClient = useQueryClient();
  
  const { messages, users, sendMessage, isLoading } = useChat(currentChatType, currentUser?.id);
  const { isConnected, socket } = useWebSocket(currentUser?.id);

  useEffect(() => {
    // Only set current user from existing users, don't create new ones automatically
    if (users.length > 0 && !currentUser) {
      setCurrentUser(users[0]);
    }
  }, [users, currentUser]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const wsMessage = JSON.parse(event.data);
        
        switch (wsMessage.type) {
          case "message":
            // Invalidate and refetch messages when new message arrives
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            break;
            
          case "message_update":
            // Handle streaming AI responses
            queryClient.setQueryData(["/api/messages"], (oldMessages: MessageWithUser[] | undefined) => {
              if (!oldMessages) return oldMessages;
              
              const messageId = wsMessage.data.id;
              const existingMessageIndex = oldMessages.findIndex(msg => msg.id === messageId);
              
              if (existingMessageIndex >= 0) {
                // Update existing message
                const updatedMessages = [...oldMessages];
                updatedMessages[existingMessageIndex] = {
                  ...updatedMessages[existingMessageIndex],
                  content: wsMessage.data.content
                };
                return updatedMessages;
              } else {
                // Add new streaming message
                const newMessage: MessageWithUser = {
                  id: messageId,
                  content: wsMessage.data.content,
                  userId: null,
                  isAI: true,
                  timestamp: new Date(),
                  isTyping: false,
                  chatType: 'general',
                  privateChatUserId: null,
                  attachments: null,
                  attachmentTypes: null,
                  attachmentNames: null,
                  user: undefined
                };
                return [...oldMessages, newMessage];
              }
            });
            break;
            
          case "user_status":
            // Update user online status
            queryClient.setQueryData(["/api/users"], (oldUsers: User[] | undefined) => {
              if (!oldUsers) return oldUsers;
              return oldUsers.map(user => 
                user.id === wsMessage.data.userId 
                  ? { ...user, isOnline: wsMessage.data.isOnline }
                  : user
              );
            });
            break;
            
          case "typing":
            // Handle typing indicators here if needed
            console.log("User typing:", wsMessage.data);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, queryClient]);

  const onlineCount = users.filter(u => u.isOnline).length;

  // Show registration form if no current user
  if (!currentUser) {
    return (
      <UserRegistration 
        onUserCreated={(user) => {
          setCurrentUser(user);
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-chat-bg cyberpunk-grid">
      {/* Sidebar */}
      <div className={`w-80 holographic border-r border-cyan-500/30 flex-shrink-0 ${sidebarOpen ? 'flex' : 'hidden'} lg:flex flex-col`}>
        <Sidebar 
          users={users} 
          currentUser={currentUser} 
          onlineCount={onlineCount}
          isAiActive={isAiActive}
          onAiToggle={() => setIsAiActive(!isAiActive)}
          currentChatType={currentChatType}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="holographic border-b border-cyan-500/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="button-toggle-sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold neon-text" data-testid="text-chat-title">
                BOOOMERANGS AI
              </h2>
              {currentChatType === "general" && (
                <span className="px-2 py-1 bg-cyan-900/50 text-cyan-300 text-xs font-medium rounded-full border border-cyan-500/50" data-testid="text-online-count">
                  {onlineCount} {onlineCount === 1 ? 'активный сотрудник' : 'активных сотрудников'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" title="Сканирование данных" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20" data-testid="button-search">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" title="Holo-связь" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20" data-testid="button-video">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" title="Системные настройки" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20" data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Chat Type Tabs */}
          <div className="flex space-x-1">
            <Button
              variant={currentChatType === "general" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentChatType("general")}
              className={`flex items-center space-x-2 transition-colors ${
                currentChatType === "general" 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20'
              }`}
              data-testid="button-general-chat"
            >
              <Users className="h-4 w-4" />
              <span>Общий чат</span>
            </Button>
            <Button
              variant={currentChatType === "private" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentChatType("private")}
              className={`flex items-center space-x-2 transition-colors ${
                currentChatType === "private" 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20'
              }`}
              data-testid="button-private-chat"
            >
              <Bot className="h-4 w-4" />
              <span>AI Чат</span>
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-2">
            <p className="text-sm text-red-400" data-testid="text-connection-status">
              Восстановление нейронных связей...
            </p>
          </div>
        )}

        {/* Messages */}
        <MessageList messages={messages} currentUser={currentUser} isLoading={isLoading} />

        {/* Message Input */}
        <MessageInput 
          onSendMessage={(content, userId, aiActive, attachments) => 
            sendMessage(content, userId, aiActive, {
              chatType: currentChatType,
              privateChatUserId: currentChatType === "private" ? currentUser?.id : undefined,
              attachments: attachments
            })
          } 
          currentUser={currentUser} 
          isAiActive={isAiActive}
          currentChatType={currentChatType}
        />
      </div>
    </div>
  );
}
