import { useEffect, useRef } from "react";
import { MessageWithUser, User } from "@shared/schema";
import { Bot, FileText, Image, Video, Music, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface MessageListProps {
  messages: MessageWithUser[];
  currentUser: User | null;
  isLoading: boolean;
}

export default function MessageList({ messages, currentUser, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimetype.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimetype.startsWith('audio/')) return <Music className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAttachments = (message: MessageWithUser) => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {message.attachments.map((attachment, index) => {
          const mimetype = message.attachmentTypes?.[index] || '';
          const filename = message.attachmentNames?.[index] || 'Файл';
          
          if (mimetype.startsWith('image/')) {
            return (
              <div key={index} className="max-w-xs">
                <img 
                  src={attachment} 
                  alt={filename}
                  className="rounded-lg border border-cyan-500/30 max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(attachment, '_blank')}
                />
                <p className="text-xs text-cyan-400 mt-1">{filename}</p>
              </div>
            );
          }

          if (mimetype.startsWith('video/')) {
            return (
              <div key={index} className="max-w-xs">
                <video 
                  controls 
                  className="rounded-lg border border-cyan-500/30 max-w-full h-auto"
                >
                  <source src={attachment} type={mimetype} />
                  Ваш браузер не поддерживает видео.
                </video>
                <p className="text-xs text-cyan-400 mt-1">{filename}</p>
              </div>
            );
          }

          if (mimetype.startsWith('audio/')) {
            return (
              <div key={index} className="max-w-xs">
                <audio 
                  controls 
                  className="w-full"
                >
                  <source src={attachment} type={mimetype} />
                  Ваш браузер не поддерживает аудио.
                </audio>
                <p className="text-xs text-cyan-400 mt-1">{filename}</p>
              </div>
            );
          }

          // Other file types
          return (
            <div key={index} className="flex items-center gap-2 bg-cyan-900/20 border border-cyan-500/30 rounded-lg px-3 py-2 max-w-xs">
              {getFileIcon(mimetype)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cyan-300 truncate">{filename}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(attachment, '_blank')}
                className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300"
                title="Скачать файл"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-16 w-72 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="message-list">
      {messages.map((message) => {
        const isCurrentUserMessage = message.userId === currentUser?.id;
        const isAI = message.isAI;

        return (
          <div 
            key={message.id} 
            className="flex items-start space-x-3"
            data-testid={`message-${message.id}`}
          >
            {/* Avatar */}
            {isAI ? (
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 neon-glow">
                <Bot className="text-black text-xs" />
              </div>
            ) : (
              <img
                src={
                  message.user?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    message.user?.displayName || "User"
                  )}&size=32`
                }
                alt={message.user?.displayName || "User"}
                className="w-8 h-8 rounded-full flex-shrink-0"
                data-testid={`img-message-avatar-${message.id}`}
              />
            )}

            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center space-x-2 mb-1">
                {isAI ? (
                  <>
                    <span className="text-sm font-medium text-cyan-300" data-testid={`text-ai-name-${message.id}`}>
                      Booomerangs AI
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-500/80 text-black text-xs font-medium rounded-full">
                      {message.chatType === "private" ? "Ваш личный ИИ" : "Командный ИИ"}
                    </span>
                  </>
                ) : (
                  <>
                    <span 
                      className="text-sm font-medium text-cyan-300"
                      data-testid={`text-message-author-${message.id}`}
                    >
                      {message.user?.displayName || "Анонимный узел"}
                    </span>
                    {isCurrentUserMessage && (
                      <span className="px-2 py-0.5 bg-cyan-500/80 text-black text-xs font-medium rounded-full">
                        Вы
                      </span>
                    )}
                  </>
                )}
                <span 
                  className="text-xs text-cyan-500"
                  data-testid={`text-message-time-${message.id}`}
                >
                  {formatTime(message.timestamp)}
                </span>
              </div>

              {/* Message Content */}
              <div className="space-y-2">
                {message.content && (
                  <div
                    className={`rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg ${
                      isAI
                        ? "holographic neon-glow"
                        : isCurrentUserMessage
                        ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-black"
                        : "bg-gray-800/50 border border-cyan-500/30"
                    }`}
                    data-testid={`text-message-content-${message.id}`}
                  >
                    <p className={isCurrentUserMessage && !isAI ? "text-black" : "text-cyan-100"}>
                      {message.content}
                    </p>
                  </div>
                )}
                
                {/* Attachments */}
                {renderAttachments(message)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
