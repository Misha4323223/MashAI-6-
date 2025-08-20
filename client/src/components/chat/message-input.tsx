import { useState, useRef, useEffect } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Bot, Smile, Send, X, FileText, Image, Video, Music } from "lucide-react";

interface FileInfo {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

interface MessageInputProps {
  onSendMessage: (content: string, userId?: string, isAiActive?: boolean, attachments?: FileInfo[]) => void;
  currentUser: User | null;
  isAiActive: boolean;
  currentChatType: "general" | "private";
}

export default function MessageInput({ onSendMessage, currentUser, isAiActive, currentChatType }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowAiSuggestion(message.includes("@ai"));
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachedFiles.length > 0) && currentUser) {
      onSendMessage(message, currentUser.id, isAiActive, attachedFiles);
      setMessage("");
      setAttachedFiles([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setAttachedFiles(prev => [...prev, ...result.files]);
      } else {
        console.error('File upload failed');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";
  };

  const insertAiMention = () => {
    const newMessage = message + (message ? " " : "") + "@ai ";
    setMessage(newMessage);
    textareaRef.current?.focus();
  };

  return (
    <div className="holographic border-t border-cyan-500/30 p-4">
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-cyan-900/20 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm">
              {getFileIcon(file.mimetype)}
              <span className="text-cyan-300 truncate max-w-32">{file.originalName}</span>
              <span className="text-cyan-500 text-xs">({formatFileSize(file.size)})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-4 w-4 p-0 text-cyan-400 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 disabled:opacity-50"
          title="Прикрепить файл"
          data-testid="button-attach"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={currentChatType === "private" ? "Сообщение AI..." : "Введите сообщение..."}
              className="resize-none min-h-[48px] max-h-32 pr-12 rounded-xl bg-gray-800/50 border-cyan-500/50 text-cyan-100 placeholder-cyan-400/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-200"
              rows={1}
              data-testid="input-message"
            />
            
            {showAiSuggestion && (
              <div 
                className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium transition-opacity neon-glow ${
                  isAiActive 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'bg-red-500/20 text-red-300'
                }`}
                data-testid="text-ai-suggestion"
              >
                {isAiActive ? 'AI активирован' : 'AI отключен'}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 text-xs text-cyan-500">
              <span>Shift + Enter для новой строки</span>
            </div>
            <div className="flex items-center space-x-2">
              {currentChatType === "general" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertAiMention}
                  disabled={!isAiActive}
                  className={`p-1.5 transition-colors ${
                    isAiActive 
                      ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20' 
                      : 'text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title={isAiActive ? "Активировать ИИ" : "ИИ отключен"}
                  data-testid="button-ai"
                >
                  <Bot className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 transition-colors"
                title="Эмодзи"
                data-testid="button-emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={(!message.trim() && attachedFiles.length === 0) || !currentUser || isUploading}
          className="cyber-button text-black p-3 rounded-xl transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Передать данные"
          data-testid="button-send"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
