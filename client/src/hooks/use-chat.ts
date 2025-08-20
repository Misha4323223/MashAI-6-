import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, MessageWithUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "./use-websocket";

export function useChat(chatType: "general" | "private" = "general", userId?: string) {
  const [currentUserId, setCurrentUserId] = useState<string>();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages", chatType, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (chatType) params.append("chatType", chatType);
      if (userId && chatType === "private") params.append("userId", userId);
      
      const response = await fetch(`/api/messages?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
  });

  // Set current user ID from the first available user
  useEffect(() => {
    if (users.length > 0 && !currentUserId) {
      setCurrentUserId(users[0].id);
    }
  }, [users, currentUserId]);

  const { sendMessage: sendWSMessage, socket } = useWebSocket(currentUserId);

  // Handle WebSocket message updates for streaming
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data.type, data);
        
        if (data.type === "message_update") {
          // Update existing message in cache for streaming
          const messageUpdate = data.data;
          console.log('🔄 Updating message:', messageUpdate.id, messageUpdate.content);
          
          queryClient.setQueryData<MessageWithUser[]>(["/api/messages", chatType, userId], (oldMessages) => {
            if (!oldMessages) return oldMessages;
            
            return oldMessages.map(msg => 
              msg.id === messageUpdate.id 
                ? { ...msg, content: messageUpdate.content }
                : msg
            );
          });
          
          // Also update general messages cache
          queryClient.setQueryData<MessageWithUser[]>(["/api/messages", "general", undefined], (oldMessages) => {
            if (!oldMessages) return oldMessages;
            
            return oldMessages.map(msg => 
              msg.id === messageUpdate.id 
                ? { ...msg, content: messageUpdate.content }
                : msg
            );
          });
        } else if (data.type === "message") {
          // New message received
          console.log('💬 New message received');
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, queryClient, chatType, userId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { 
      content: string; 
      userId: string; 
      isAiActive?: boolean; 
      chatType?: string; 
      privateChatUserId?: string;
      attachments?: any[]
    }) => {
      const messageData: any = {
        content: data.content,
        userId: data.userId,
        isAI: false,
        isTyping: false,
        isAiActive: data.isAiActive,
        chatType: data.chatType || "general",
        privateChatUserId: data.privateChatUserId,
      };

      // Add file attachments if present
      if (data.attachments && data.attachments.length > 0) {
        messageData.attachments = data.attachments.map(file => file.url);
        messageData.attachmentTypes = data.attachments.map(file => file.mimetype);
        messageData.attachmentNames = data.attachments.map(file => file.originalName);
      }

      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Обновляем кэш для текущего типа чата
      const actualChatType = variables.chatType || "general";
      const actualUserId = variables.privateChatUserId;
      queryClient.invalidateQueries({ queryKey: ["/api/messages", actualChatType, actualUserId] });
      
      // Дополнительно обновляем общий кэш сообщений
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // WebSocket connection handling will be done through the useWebSocket hook

  const sendMessage = (content: string, userIdToSend?: string, isAiActive?: boolean, messageData?: { chatType?: string; privateChatUserId?: string; attachments?: any[] }) => {
    if (userIdToSend) {
      sendMessageMutation.mutate({ 
        content, 
        userId: userIdToSend, 
        isAiActive,
        chatType: messageData?.chatType,
        privateChatUserId: messageData?.privateChatUserId,
        attachments: messageData?.attachments
      });
    }
  };

  return {
    users,
    messages,
    sendMessage,
    isLoading,
    currentUserId,
  };
}
