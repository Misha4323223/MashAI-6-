import { User } from "@shared/schema";

interface TeamMemberProps {
  user: User;
  isCurrentUser: boolean;
}

export default function TeamMember({ user, isCurrentUser }: TeamMemberProps) {
  const getStatusColor = () => {
    if (user.isOnline) return "bg-cyan-400";
    return "bg-gray-600";
  };

  return (
    <div 
      className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-cyan-900/20 cursor-pointer ${
        isCurrentUser ? "bg-cyan-500/10 border border-cyan-500/30" : ""
      }`}
      data-testid={`team-member-${user.username}`}
    >
      <img 
        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&size=40`}
        alt={user.displayName}
        className={`w-10 h-10 rounded-full object-cover ${
          isCurrentUser ? "ring-2 ring-cyan-400" : ""
        }`}
        data-testid={`img-avatar-${user.username}`}
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span 
            className="text-sm font-medium text-cyan-300"
            data-testid={`text-name-${user.username}`}
          >
            {user.displayName}
          </span>
          <div className={`w-3 h-3 ${getStatusColor()} rounded-full shadow-lg shadow-cyan-500/50`}></div>
          {isCurrentUser && (
            <span className="text-xs text-cyan-400 font-medium" data-testid="text-current-user">
              Вы
            </span>
          )}
        </div>
        <p 
          className="text-xs text-cyan-500"
          data-testid={`text-role-${user.username}`}
        >
          {user.role}
        </p>
      </div>
    </div>
  );
}
