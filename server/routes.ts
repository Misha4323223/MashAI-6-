import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

interface ClientInfo {
  userId?: string;
  ws: WebSocket;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mp3|wav|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<WebSocket, ClientInfo>();

  // File upload endpoint
  app.post("/api/upload", upload.array('files', 10), (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const fileInfos = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${file.filename}`
      }));

      res.json({ files: fileInfos });
    } catch (error) {
      res.status(500).json({ error: "File upload failed" });
    }
  });

  // API Routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.delete("/api/clear", async (req, res) => {
    try {
      await storage.clearAll();
      res.json({ message: "All data cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const chatType = (req.query.chatType as string) || "general";
      const userId = req.query.userId as string;
      const messages = await storage.getMessages(limit, chatType, userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const isAiActive = req.body.isAiActive !== false; // Default to true for backwards compatibility
      const chatType = messageData.chatType || "general";
      const message = await storage.createMessage(messageData);
      
      const messageWithUser = {
        ...message,
        user: message.userId ? await storage.getUser(message.userId) : undefined,
      };

      // Broadcast user message to all clients immediately
      broadcast({
        type: "message",
        data: messageWithUser,
      });

      // Return HTTP response immediately so UI updates
      res.json(messageWithUser);

      // Determine if AI should respond based on chat type and activation status
      const shouldCallAI = !messageData.isAI && (
        (chatType === "private") || // Always respond in private chats
        (chatType === "general" && isAiActive) // Respond in general chat only if AI is active
      );
      
      // Process AI response asynchronously after sending HTTP response
      if (shouldCallAI) {
        setImmediate(async () => {
          try {
            await callQwenAPI(messageData.content, messageData.chatType || 'general', messageData.privateChatUserId || undefined);
          } catch (aiError) {
            console.error("Error generating AI response:", aiError);
          }
        });
      }
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws) => {
    clients.set(ws, { ws });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const clientInfo = clients.get(ws);

        switch (message.type) {
          case 'auth':
            if (clientInfo) {
              clientInfo.userId = message.userId;
              await storage.updateUserOnlineStatus(message.userId, true);
              
              // Broadcast user online status
              broadcast({
                type: "user_status",
                data: { userId: message.userId, isOnline: true },
              });
            }
            break;

          case 'typing':
            if (clientInfo?.userId) {
              await storage.updateMessageTyping(clientInfo.userId, message.isTyping);
              
              // Broadcast typing status to other clients
              broadcastToOthers(ws, {
                type: "typing",
                data: { 
                  userId: clientInfo.userId, 
                  isTyping: message.isTyping,
                  user: await storage.getUser(clientInfo.userId)
                },
              });
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on('close', async () => {
      const clientInfo = clients.get(ws);
      if (clientInfo?.userId) {
        await storage.updateUserOnlineStatus(clientInfo.userId, false);
        
        // Broadcast user offline status
        broadcast({
          type: "user_status",
          data: { userId: clientInfo.userId, isOnline: false },
        });
      }
      clients.delete(ws);
    });
  });

  function broadcast(message: any) {
    clients.forEach((clientInfo) => {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.send(JSON.stringify(message));
      }
    });
  }

  function broadcastToOthers(sender: WebSocket, message: any) {
    clients.forEach((clientInfo, ws) => {
      if (ws !== sender && clientInfo.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.send(JSON.stringify(message));
      }
    });
  }

  async function callQwenAPI(prompt: string, chatType?: string, privateChatUserId?: string): Promise<string> {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY || "";
      const modelName = 'qwen/qwen3-235b-a22b:free';
      
      console.log(`🤖 AI Request: Using model ${modelName}`);
      console.log(`🤖 User prompt: "${prompt}"`);
      
      if (!apiKey) {
        return "Извините, но я не настроен для ответов прямо сейчас. Пожалуйста, обратитесь к администратору по поводу конфигурации API ключа.";
      }

      // Clean the prompt by removing @ai mentions
      const cleanPrompt = prompt.replace(/@ai\s*/gi, '').trim();
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'BMGBRAND Chat'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-235b-a22b:free',
          messages: [
            {
              role: 'system',
              content: 'Вы - Booomerangs AI, полезный помощник, интегрированный в приложение командного чата BMGBRAND Chat. Предоставляйте краткие, профессиональные ответы, подходящие для рабочей среды. Отвечайте кратко и по существу, если не просят подробных объяснений. Отвечайте на русском языке.'
            },
            {
              role: 'user',
              content: cleanPrompt
            }
          ],
          max_tokens: 300,
          temperature: 0.6,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      console.log(`📥 Response status: ${response.status}`);
      console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
      
      // Create AI message placeholder first
      const aiMessage = await storage.createMessage({
        content: '',
        userId: undefined,
        isAI: true,
        isTyping: false,
        chatType: chatType || 'general',
        privateChatUserId: privateChatUserId,
      });

      // Broadcast empty AI message first
      broadcast({
        type: "message",
        data: {
          ...aiMessage,
          user: undefined,
        },
      });

      // Handle streaming response
      if (!response.body) {
        console.error('❌ No response body');
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;

      console.log(`📡 Starting to read streaming response...`);

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`✅ Stream completed. Total chunks: ${chunkCount}`);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              
              if (jsonStr === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  fullResponse += content;
                  
                  // Update message in storage
                  await storage.updateMessage(aiMessage.id, { content: fullResponse });
                  
                  // Broadcast updated message
                  broadcast({
                    type: "message_update",
                    data: {
                      id: aiMessage.id,
                      content: fullResponse,
                      isComplete: false
                    },
                  });
                }
              } catch (parseError) {
                console.error('❌ Error parsing streaming data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Final broadcast with complete message
      broadcast({
        type: "message_update",
        data: {
          id: aiMessage.id,
          content: fullResponse,
          isComplete: true
        },
      });

      console.log(`🎯 Final AI Response (${modelName}): "${fullResponse}"`);
      return fullResponse;

    } catch (error) {
      console.error("🚨 OpenRouter API error:", error);
      return "У меня сейчас технические трудности. Попробуйте через момент, или свяжитесь с командой напрямую, если это срочно.";
    }
  }

  return httpServer;
}
