import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import newLogo from "@assets/BOOOMERANGS LOGO_1755704043468.png";

interface UserRegistrationProps {
  onUserCreated: (user: any) => void;
}

export default function UserRegistration({ onUserCreated }: UserRegistrationProps) {
  const [formData, setFormData] = useState({
    displayName: "",
    role: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'user_' + Date.now(),
          displayName: formData.displayName.trim(),
          role: formData.role.trim() || 'Участник команды',
          avatar: null,
          isOnline: true,
        }),
      });
      
      if (response.ok) {
        const newUser = await response.json();
        onUserCreated(newUser);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chat-bg cyberpunk-grid flex items-center justify-center p-4">
      <Card className="w-full max-w-md holographic">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4 mb-2">
            <img 
              src={newLogo} 
              alt="BOOOMERANGS Logo" 
              className="w-80 h-auto"
            />
            <div>
              <CardTitle className="text-xl neon-text">BMGBRAND Chat</CardTitle>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-cyan-300 mb-1">
                Ваш позывной *
              </label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Введите позывной"
                className="bg-gray-900/50 border-cyan-500/50 text-cyan-100 placeholder-cyan-400/70 focus:border-cyan-400 focus:ring-cyan-400"
                required
                data-testid="input-display-name"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-cyan-300 mb-1">
                Роль в системе (необязательно)
              </label>
              <Input
                id="role"
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Хакер, Оператор, Техник..."
                className="bg-gray-900/50 border-cyan-500/50 text-cyan-100 placeholder-cyan-400/70 focus:border-cyan-400 focus:ring-cyan-400"
                data-testid="input-role"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full cyber-button text-black font-bold"
              disabled={!formData.displayName.trim() || isLoading}
              data-testid="button-join-chat"
            >
              <User className="h-4 w-4 mr-2" />
              {isLoading ? "Инициализация..." : "Войти в сеть"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}