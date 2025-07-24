
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface TweetComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TweetComposer = ({ open, onOpenChange }: TweetComposerProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('tweets')
      .insert({
        user_id: user.id,
        content: content.trim()
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post tweet",
        variant: "destructive",
      });
    } else {
      setContent('');
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Tweet posted successfully!",
      });
      // Dispatch custom event to notify Dashboard to refresh
      window.dispatchEvent(new CustomEvent('tweetPosted'));
    }
    
    setIsSubmitting(false);
  };

  const remainingChars = 280 - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Compose Tweet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(user?.name || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none border-none shadow-none text-lg placeholder:text-lg focus-visible:ring-0 min-h-[120px] bg-transparent text-foreground placeholder:text-muted-foreground"
                maxLength={300} // Allow slight overflow for UX
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${
                  isOverLimit ? 'text-destructive' : remainingChars <= 20 ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  {remainingChars}
                </span>
                <Button 
                  type="submit" 
                  disabled={!content.trim() || isOverLimit || isSubmitting}
                  className="rounded-full px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TweetComposer;
