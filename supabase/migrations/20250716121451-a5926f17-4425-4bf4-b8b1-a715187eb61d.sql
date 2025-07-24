
-- Drop the existing messages table and create new tables for tweets functionality
DROP TABLE IF EXISTS public.messages;

-- Create tweets table
CREATE TABLE public.tweets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tweet_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) policies for tweets
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tweets are viewable by everyone" 
  ON public.tweets 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create tweets" 
  ON public.tweets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tweets" 
  ON public.tweets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tweets" 
  ON public.tweets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add Row Level Security (RLS) policies for likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" 
  ON public.likes 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create likes" 
  ON public.likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
  ON public.likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add Row Level Security (RLS) policies for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create comments" 
  ON public.comments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON public.comments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.comments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create functions to update counts
CREATE OR REPLACE FUNCTION update_tweet_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tweets 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.tweet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tweets 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.tweet_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tweet_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tweets 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.tweet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tweets 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.tweet_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER likes_count_trigger
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_tweet_likes_count();

CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_tweet_comments_count();

-- Create trigger for updating updated_at on tweets
CREATE TRIGGER update_tweets_updated_at
  BEFORE UPDATE ON public.tweets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updating updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
