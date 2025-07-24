
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SkeletonTweetDetail, SkeletonComment } from '@/components/ui/skeleton-tweet';
import { MinimalLoader } from '@/components/LoadingSpinner';

// Helper function to detect and linkify URLs in text
const linkifyText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const url = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface Tweet {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  user_liked?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const CommentsPage = () => {
  const { tweetId } = useParams<{ tweetId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [tweetLoading, setTweetLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [fastLoad, setFastLoad] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchTweetAndComments = async () => {
    if (!tweetId || !user) return;

    const startTime = Date.now();

    try {
      // Progressive loading: Fetch tweet first
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select('id, user_id, content, likes_count, comments_count, created_at')
        .eq('id', tweetId)
        .single();

      if (tweetError) {
        console.error('Error fetching tweet:', tweetError);
        setTweetLoading(false);
        return;
      }

      // Fetch tweet author profile and user like status in parallel
      const [
        { data: tweetProfile },
        { data: userLike }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', tweetData.user_id)
          .single(),
        supabase
          .from('likes')
          .select('id')
          .eq('tweet_id', tweetId)
          .eq('user_id', user.id)
          .single()
      ]);

      setTweet({
        ...tweetData,
        profiles: tweetProfile || null,
        user_liked: !!userLike
      });

      setTweetLoading(false);

      // Check if load was fast (under 200ms)
      const loadTime = Date.now() - startTime;
      setFastLoad(loadTime < 200);

      // Now fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, user_id, content, created_at')
        .eq('tweet_id', tweetId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        setCommentsLoading(false);
        return;
      }

      // Fetch profiles for all comment authors
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null
      })) || [];

      setComments(commentsWithProfiles);
      setCommentsLoading(false);

      // Scroll to bottom after loading comments
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error fetching data:', error);
      setTweetLoading(false);
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchTweetAndComments();

    // Set up real-time subscription for new comments
    const commentsChannel = supabase
      .channel(`comments_${tweetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `tweet_id=eq.${tweetId}`
        },
        async (payload) => {
          console.log('New comment received:', payload);
          // Fetch the new comment with profile
          const { data: newCommentData } = await supabase
            .from('comments')
            .select('id, user_id, content, created_at')
            .eq('id', payload.new.id)
            .single();

          if (newCommentData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newCommentData.user_id)
              .single();

            const commentWithProfile = {
              ...newCommentData,
              profiles: profile || null
            };

            setComments(prev => [...prev, commentWithProfile]);
            
            // Update tweet comments count
            setTweet(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null);

            // Auto-scroll to new comment
            setTimeout(() => {
              commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tweets',
          filter: `id=eq.${tweetId}`
        },
        (payload) => {
          console.log('Tweet updated:', payload);
          // Update the tweet with new counts from database
          setTweet(prev => prev ? {
            ...prev,
            likes_count: payload.new.likes_count,
            comments_count: payload.new.comments_count
          } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [tweetId, user]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !tweetId) return;

    const { error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        tweet_id: tweetId,
        content: newComment
      });

    if (error) {
      console.error('Error sending comment:', error);
      toast({
        title: "Error",
        description: "Failed to send comment",
        variant: "destructive",
      });
    } else {
      setNewComment('');
      toast({
        title: "Success",
        description: "Comment posted successfully!",
      });
      
      // Auto-refresh the data to ensure consistency
      setTimeout(() => {
        fetchTweetAndComments();
      }, 500);
    }
  };

  const handleLike = async (isLiked: boolean) => {
    if (!user || !tweet) return;

    // Optimistically update the UI first
    const newLikesCount = isLiked ? tweet.likes_count - 1 : tweet.likes_count + 1;
    setTweet(prev => prev ? { 
      ...prev, 
      likes_count: newLikesCount, 
      user_liked: !isLiked 
    } : null);

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweet.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unliking tweet:', error);
        // Revert the optimistic update
        setTweet(prev => prev ? { 
          ...prev, 
          likes_count: tweet.likes_count, 
          user_liked: true 
        } : null);
        toast({
          title: "Error",
          description: "Failed to unlike tweet",
          variant: "destructive",
        });
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          tweet_id: tweet.id,
          user_id: user.id
        });

      if (error) {
        console.error('Error liking tweet:', error);
        // Revert the optimistic update
        setTweet(prev => prev ? { 
          ...prev, 
          likes_count: tweet.likes_count, 
          user_liked: false 
        } : null);
        toast({
          title: "Error",
          description: "Failed to like tweet",
          variant: "destructive",
        });
      }
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleNameClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (tweetLoading && !fastLoad) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b z-10">
          <div className="flex items-center p-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Tweet</h1>
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <SkeletonTweetDetail />
          <div className="border-b p-4">
            <div className="flex space-x-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-20 bg-muted animate-pulse rounded" />
                <div className="flex justify-end">
                  <div className="h-8 w-16 bg-muted animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonComment key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tweet && !tweetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Tweet not found</h2>
          <Link to="/dashboard">
            <Button>Go back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const senderName = tweet?.profiles?.display_name || 'Unknown User';

  return (
    <div className="min-h-screen bg-background">
      <MinimalLoader show={!fastLoad && (tweetLoading || commentsLoading)} />
      
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b z-10">
        <div className="flex items-center p-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Tweet</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Original Tweet */}
        {tweet ? (
          <div className="border-b p-6 animate-fade-in">
            <div className="flex space-x-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={tweet.profiles?.avatar_url || undefined} alt={senderName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {senderName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => handleNameClick(tweet.user_id)}
                    className="font-bold text-foreground hover:underline cursor-pointer"
                  >
                    {senderName}
                  </button>
                </div>
                <div className="text-foreground text-lg mb-4 break-words">
                  {linkifyText(tweet.content)}
                </div>
                <div className="text-muted-foreground text-sm mb-4">
                  {formatTime(tweet.created_at)}
                </div>
                <div className="flex items-center space-x-6 text-muted-foreground border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm">{tweet.comments_count}</span>
                  </div>
                  {/* Like feature is hidden for now */}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SkeletonTweetDetail />
        )}

        {/* Comment Composer */}
        <div className="border-b p-4">
          <form onSubmit={handleSendComment} className="space-y-3">
            <div className="flex space-x-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(user?.name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Textarea 
                placeholder="Tweet your reply" 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)} 
                className="flex-1 resize-none border-none shadow-none focus-visible:ring-0"
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!newComment.trim()}
                className="rounded-full px-6"
              >
                Reply
              </Button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        <div>
          {commentsLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonComment key={i} />
              ))}
            </div>
          ) : (
            comments.map(comment => {
              const commenterName = comment.profiles?.display_name || 'Unknown User';
              return (
                <div key={comment.id} className="border-b p-4 hover:bg-accent/50 transition-colors animate-fade-in">
                  <div className="flex space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} alt={commenterName} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {commenterName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <button
                          onClick={() => handleNameClick(comment.user_id)}
                          className="font-semibold text-foreground hover:underline cursor-pointer"
                        >
                          {commenterName}
                        </button>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-muted-foreground text-sm">
                          {new Date(comment.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-foreground break-words">
                        {linkifyText(comment.content)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default CommentsPage;
