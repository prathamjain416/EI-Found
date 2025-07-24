import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const ChatPage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchOtherUser = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', userId)
        .single();
      
      setOtherUser(data);
    };

    fetchOtherUser();
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: Date.now().toString(),
      user_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!otherUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">User not found</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.avatar_url || undefined} alt={otherUser.display_name || 'User'} />
              <AvatarFallback className="bg-purple-100 text-purple-700">
                {(otherUser.display_name || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{otherUser.display_name || 'Unknown User'}</h3>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="p-4 space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.user_id === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage 
                        src={isOwnMessage ? user?.avatar : otherUser.avatar_url || undefined} 
                        alt={isOwnMessage ? user?.name : otherUser.display_name || 'User'} 
                      />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                        {isOwnMessage ? user?.name.charAt(0) : (otherUser.display_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-3 ${isOwnMessage ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <div className="flex-shrink-0 border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ChatPage;