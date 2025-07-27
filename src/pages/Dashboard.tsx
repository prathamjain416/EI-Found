import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Users, Search, Send, Menu, X, Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import TweetComposer from '../components/TweetComposer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SkeletonTweet, SkeletonUserList } from '@/components/ui/skeleton-tweet';
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
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all cursor-pointer"
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

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  email: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newTweet, setNewTweet] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tweetComposerOpen, setTweetComposerOpen] = useState(false);
  const [tweetsLoading, setTweetsLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [fastLoad, setFastLoad] = useState(false);
  const tweetsEndRef = useRef<HTMLDivElement>(null);

  // Listen for sidebar toggle events from navbar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(true);
    };

    const handleOpenTweetComposer = () => {
      setTweetComposerOpen(true);
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    window.addEventListener('openTweetComposer', handleOpenTweetComposer);

    return () => {
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
      window.removeEventListener('openTweetComposer', handleOpenTweetComposer);
    };
  }, []);

  const fetchTweets = async () => {
    if (!user) return;

    const startTime = Date.now();
    
    try {
      // Progressive loading: Fetch tweets first
      const { data: tweetsData, error: tweetsError } = await supabase
        .from('tweets')
        .select('*')
        .order('created_at', { ascending: false });

      if (tweetsError) {
        console.error('Error fetching tweets:', tweetsError);
        setTweetsLoading(false);
        return;
      }

      // Then fetch profiles and likes in parallel
      const userIds = [...new Set(tweetsData?.map(tweet => tweet.user_id) || [])];
      const [
        { data: profilesData, error: profilesError },
        { data: userLikes, error: likesError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds),
        supabase
          .from('likes')
          .select('tweet_id')
          .eq('user_id', user.id)
      ]);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      if (likesError) {
        console.error('Error fetching user likes:', likesError);
      }

      // Create a map of user_id to profile
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      const likedTweetIds = new Set(userLikes?.map(like => like.tweet_id) || []);

      // Combine tweets with profile data
      const tweetsWithProfiles = tweetsData?.map(tweet => ({
        ...tweet,
        profiles: profilesMap.get(tweet.user_id) || null,
        user_liked: likedTweetIds.has(tweet.id)
      })) || [];

      setTweets(tweetsWithProfiles);
      
      // Check if load was fast (under 200ms)
      const loadTime = Date.now() - startTime;
      setFastLoad(loadTime < 200);
      setTweetsLoading(false);
    } catch (error) {
      console.error('Error fetching tweets:', error);
      setTweetsLoading(false);
    }
  };

  // Fetch tweets and profiles with real-time subscription
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Progressive loading: Start with tweets, then sidebar profiles
      await fetchTweets();

      // Fetch all profiles for the sidebar separately
      try {
        const { data: allProfilesData, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*');

        if (allProfilesError) {
          console.error('Error fetching all profiles:', allProfilesError);
        } else {
          setProfiles(allProfilesData || []);
        }
      } catch (error) {
        console.error('Error fetching sidebar profiles:', error);
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for tweets
    const channel = supabase
      .channel('tweets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tweets'
        },
        async (payload) => {
          console.log('New tweet received:', payload);
          
          // Fetch the profile for the new tweet's author
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for new tweet:', profileError);
          }

          const newTweetWithProfile: Tweet = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            likes_count: payload.new.likes_count,
            comments_count: payload.new.comments_count,
            created_at: payload.new.created_at,
            profiles: profileData ? {
              display_name: profileData.display_name,
              avatar_url: profileData.avatar_url
            } : null,
            user_liked: false
          };
          
          setTweets(prev => [newTweetWithProfile, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tweets'
        },
        (payload) => {
          console.log('Tweet updated:', payload);
          setTweets(prev => prev.map(tweet => 
            tweet.id === payload.new.id 
              ? { ...tweet, likes_count: payload.new.likes_count, comments_count: payload.new.comments_count }
              : tweet
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tweets'
        },
        (payload) => {
          console.log('Tweet deleted:', payload);
          setTweets(prev => prev.filter(tweet => tweet.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Listen for tweet composer events to refresh tweets
  useEffect(() => {
    const handleTweetPosted = () => {
      // Refresh tweets after a short delay to ensure the tweet is in the database
      setTimeout(() => {
        fetchTweets();
      }, 500);
    };

    window.addEventListener('tweetPosted', handleTweetPosted);

    return () => {
      window.removeEventListener('tweetPosted', handleTweetPosted);
    };
  }, [user]);

  const handleSendTweet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTweet.trim() || !user || newTweet.length > 280) return;

    const { error } = await supabase
      .from('tweets')
      .insert({
        user_id: user.id,
        content: newTweet.trim()
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send tweet",
        variant: "destructive",
      });
    } else {
      setNewTweet('');
      toast({
        title: "Success",
        description: "Tweet posted successfully!",
      });
      // Refresh tweets after posting to ensure consistency
      setTimeout(() => {
        fetchTweets();
      }, 500);
    }
  };

  const handleLike = async (tweetId: string, isLiked: boolean) => {
    if (!user) return;

    // Find the current tweet to get the current like count
    const currentTweet = tweets.find(t => t.id === tweetId);
    if (!currentTweet) return;

    // Optimistically update the UI first
    const newLikesCount = isLiked ? currentTweet.likes_count - 1 : currentTweet.likes_count + 1;
    setTweets(prev => prev.map(tweet => 
      tweet.id === tweetId 
        ? { 
            ...tweet, 
            likes_count: newLikesCount, 
            user_liked: !isLiked 
          }
        : tweet
    ));

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweetId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unliking tweet:', error);
        // Revert the optimistic update
        setTweets(prev => prev.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, likes_count: currentTweet.likes_count, user_liked: true }
            : tweet
        ));
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
          tweet_id: tweetId,
          user_id: user.id
        });

      if (error) {
        console.error('Error liking tweet:', error);
        // Revert the optimistic update
        setTweets(prev => prev.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, likes_count: currentTweet.likes_count, user_liked: false }
            : tweet
        ));
        toast({
          title: "Error",
          description: "Failed to like tweet",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteTweet = async (tweetId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete tweet",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Tweet deleted successfully",
      });
      // Remove the tweet from state immediately
      setTweets(prev => prev.filter(tweet => tweet.id !== tweetId));
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatTime(timestamp);
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Filter to show only other users (not current user) and exclude any null/undefined profiles
  const otherProfiles = profiles.filter(p => 
    p.user_id !== user?.id && 
    p.display_name && 
    p.user_id
  );
  
  const filteredUsers = otherProfiles.filter(p => 
    p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const remainingChars = 280 - newTweet.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MinimalLoader show={!fastLoad && (tweetsLoading || profilesLoading)} />
      <div className="h-[calc(100vh-64px)] flex relative">
        {/* Main Tweet Feed */}
        <div className="flex-1 flex flex-col bg-background border-r border-border min-w-0">
          {/* Tweet Composer */}
          <div className="border-b border-border p-4 bg-background">
            <form onSubmit={handleSendTweet} className="space-y-3">
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
                    value={newTweet} 
                    onChange={e => setNewTweet(e.target.value)} 
                    className="flex-1 resize-none border-none shadow-none text-xl placeholder:text-muted-foreground focus-visible:ring-0 bg-transparent"
                    rows={3}
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-sm ${
                      isOverLimit ? 'text-destructive' : remainingChars <= 20 ? 'text-orange-500' : 'text-muted-foreground'
                    }`}>
                      {remainingChars}
                    </span>
                    <Button 
                      type="submit" 
                      disabled={!newTweet.trim() || isOverLimit}
                      className="rounded-full px-6"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Tweets Feed */}
          <div className="flex-1 overflow-y-auto">
            {tweetsLoading && !fastLoad ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTweet key={i} />
                ))}
              </div>
            ) : (
              tweets.map(tweet => {
                const senderName = tweet.profiles?.display_name || 'Unknown User';
                const isOwnTweet = tweet.user_id === user?.id;
                return (
                  <div key={tweet.id} className="border-b border-border hover:bg-accent/50 transition-colors animate-fade-in">
                  <div className="p-4">
                    <div className="flex space-x-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={tweet.profiles?.avatar_url || undefined} alt={senderName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <button
                              onClick={() => handleUserClick(tweet.user_id)}
                              className="font-semibold text-foreground hover:underline cursor-pointer"
                            >
                              {senderName}
                            </button>
                            <span className="text-muted-foreground text-sm">·</span>
                            <span className="text-muted-foreground text-sm">{formatDate(tweet.created_at)}</span>
                          </div>
                          {isOwnTweet && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTweet(tweet.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="text-foreground mb-3 break-words whitespace-pre-wrap">
                          {linkifyText(tweet.content)}
                        </div>
                        <div className="flex items-center space-x-6 text-muted-foreground">
                          <Link 
                            to={`/comments/${tweet.id}`}
                            className="flex items-center space-x-2 hover:text-blue-500 transition-colors"
                          >
                            <MessageCircle className="h-5 w-5" />
                            <span className="text-sm">{tweet.comments_count}</span>
                          </Link>
                          {/* Like feature is hidden for now */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
            <div ref={tweetsEndRef} />
          </div>
        </div>

        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0
          transition-transform duration-300 ease-in-out
          fixed lg:relative
          top-0 lg:top-auto
          right-0
          h-full lg:h-auto
          w-full sm:w-72 lg:w-80
          bg-background border-l border-border
          flex-shrink-0
          z-50 lg:z-auto
          flex flex-col
        `}>
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Members</span>
                <span className="sm:hidden">Members</span>
              </h3>
              <Button
                variant="ghost" 
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10 text-sm" 
              />
            </div>
          </div>
          
          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {profilesLoading ? (
              <SkeletonUserList />
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredUsers.map(member => (
                <div key={member.id} className="flex items-start space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-accent">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.display_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(member.display_name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                      {member.display_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    {member.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                    {member.is_admin && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                        Admin
                      </span>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="flex-shrink-0 h-7 px-2 sm:h-8 sm:px-3 text-xs sm:text-sm">
                    <Link to={`/profile/${member.user_id}`}>
                      View
                    </Link>
                  </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {searchTerm ? `No members found matching "${searchTerm}"` : 'No members to show.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      <TweetComposer 
        open={tweetComposerOpen} 
        onOpenChange={setTweetComposerOpen} 
      />
    </div>
  );
};

export default Dashboard;
