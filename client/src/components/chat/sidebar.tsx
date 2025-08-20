import { useState } from "react";
import { User } from "@shared/schema";
import { Brain, Cpu } from "lucide-react";
import TeamMember from "./team-member";
import newLogo from "@assets/BOOOMERANGS LOGO_1755704043468.png";

interface SidebarProps {
  users: User[];
  currentUser: User | null;
  onlineCount: number;
  isAiActive: boolean;
  onAiToggle: () => void;
  currentChatType: "general" | "private";
}

export default function Sidebar({ users, currentUser, onlineCount, isAiActive, onAiToggle, currentChatType }: SidebarProps) {

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30">
        <div className="flex flex-col items-center -mt-12">
          <img 
            src={newLogo} 
            alt="BOOOMERANGS Logo" 
            className="w-48 h-auto"
          />
          <div className="text-center -mt-8">
            <h1 className="text-lg font-semibold neon-text" data-testid="text-app-title">
              BMGBRAND Chat
            </h1>
          </div>
        </div>
      </div>

      {/* AI Assistant Card */}
      {currentChatType === "general" && (
        <div className="p-4 border-b border-cyan-500/30">
          <div className="holographic rounded-xl p-3 neon-glow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onAiToggle}
                  className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center neon-glow hover:bg-cyan-500/30 transition-colors cursor-pointer"
                >
                  <Cpu className="text-sm text-cyan-300" />
                </button>
                <span className="font-medium text-cyan-300" data-testid="text-ai-name">
                  BMG AI
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isAiActive ? 'bg-cyan-400 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-xs text-cyan-400" data-testid="text-ai-status">
                  {isAiActive ? 'Активен' : 'Не активен'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Private AI Chat Info */}
      {currentChatType === "private" && (
        <div className="p-4 border-b border-cyan-500/30">
          <div className="holographic rounded-xl p-3 neon-glow">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center neon-glow">
                <Cpu className="text-sm text-cyan-300" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-cyan-300 block" data-testid="text-ai-name">
                  BMG AI - Приватный режим
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-xs text-cyan-400">Всегда активен</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      {currentChatType === "general" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {users.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wide mb-3" data-testid="text-team-header">
                  {users.length === 1 ? 'Активный сотрудник' : 'Активные сотрудники'} ({users.length})
                </h3>
                
                <div className="space-y-2">
                  {users.map((user) => (
                    <TeamMember
                      key={user.id}
                      user={user}
                      isCurrentUser={currentUser?.id === user.id}
                    />
                  ))}
                </div>
              </>
            )}
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500" data-testid="text-no-users">
                  Пока нет других участников
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Private Chat Info */}
      {currentChatType === "private" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center neon-glow mx-auto mb-4">
              <Cpu className="text-2xl text-cyan-300" />
            </div>
            <h3 className="text-lg font-medium text-cyan-300 mb-2">
              Приватный чат с AI
            </h3>
            <p className="text-sm text-cyan-400/70 max-w-xs">
              Общение происходит только между вами и BMG AI. 
              Ваши сообщения не видны другим пользователям.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
