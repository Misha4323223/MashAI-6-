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

  // Fetch messages with reduced polling
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
    refetchInterval: 10000, // Reduce to 10 seconds instead of constant polling
    refetchOnWindowFocus: false,
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
          // New message received - add to cache immediately
          console.log('💬 New message received');
          const newMessage = data.data;
          
          // Add to current chat cache
          queryClient.setQueryData<MessageWithUser[]>(["/api/messages", chatType, userId], (oldMessages) => {
            if (!oldMessages) return [newMessage];
            // Check if message already exists to avoid duplicates
            const exists = oldMessages.some(msg => msg.id === newMessage.id);
            return exists ? oldMessages : [...oldMessages, newMessage];
          });
          
          // Also add to general cache if needed
          if (chatType !== "general" || userId) {
            queryClient.setQueryData<MessageWithUser[]>(["/api/messages", "general", undefined], (oldMessages) => {
              if (!oldMessages) return [newMessage];
              const exists = oldMessages.some(msg => msg.id === newMessage.id);
              return exists ? oldMessages : [...oldMessages, newMessage];
            });
          }
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

  // Send message mutation with optimistic updates
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
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/messages"] });

      // Create optimistic message
      const user = users.find(u => u.id === variables.userId);
      const optimisticMessage: MessageWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        content: variables.content,
        userId: variables.userId,
        isAI: false,
        isTyping: false,
        chatType: variables.chatType || "general",
        privateChatUserId: variables.privateChatUserId || null,
        timestamp: new Date(),
        attachments: variables.attachments?.map(file => file.url) || null,
        attachmentTypes: variables.attachments?.map(file => file.mimetype) || null,
        attachmentNames: variables.attachments?.map(file => file.originalName) || null,
        user: user || undefined,
      };

      // Add optimistic update to cache
      const actualChatType = variables.chatType || "general";
      const actualUserId = variables.privateChatUserId;
      
      queryClient.setQueryData<MessageWithUser[]>(["/api/messages", actualChatType, actualUserId], (oldMessages) => {
        return [...(oldMessages || []), optimisticMessage];
      });

      return { optimisticMessage };
    },
    onSuccess: (newMessage, variables, context) => {
      // Replace optimistic message with real one
      const actualChatType = variables.chatType || "general";
      const actualUserId = variables.privateChatUserId;
      
      queryClient.setQueryData<MessageWithUser[]>(["/api/messages", actualChatType, actualUserId], (oldMessages) => {
        return (oldMessages || []).map(msg => 
          msg.id === context?.optimisticMessage.id ? newMessage : msg
        );
      });
    },
    onError: (error, variables, context) => {
      // Remove optimistic update on error
      const actualChatType = variables.chatType || "general";
      const actualUserId = variables.privateChatUserId;
      
      queryClient.setQueryData<MessageWithUser[]>(["/api/messages", actualChatType, actualUserId], (oldMessages) => {
        return (oldMessages || []).filter(msg => msg.id !== context?.optimisticMessage.id);
      });
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
