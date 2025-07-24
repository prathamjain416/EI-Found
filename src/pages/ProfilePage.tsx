
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit3, Save, X, Mail, Calendar, Globe, Users, Heart, Camera, Upload, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { SkeletonProfile } from '@/components/ui/skeleton-tweet';
import { MinimalLoader } from '@/components/LoadingSpinner';

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about: string | null;
  program: string | null;
  section: string | null;
  batch: string | null;
  hobby: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
}

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileUser, setProfileUser] = useState<Profile | null>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    about: '',
    program: '',
    section: '',
    batch: '',
    hobby: '',
    website: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    avatar: ''
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fastLoad, setFastLoad] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const startTime = Date.now();

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfileUser(data);
          setProfileData({
            name: data.display_name || '',
            bio: data.bio || '',
            about: data.about || '',
            program: data.program || '',
            section: data.section || '',
            batch: data.batch || '',
            hobby: data.hobby || '',
            website: data.website || '',
            instagram: data.instagram || '',
            linkedin: data.linkedin || '',
            twitter: data.twitter || '',
            avatar: data.avatar_url || ''
          });
        }

        // Check if load was fast (under 200ms)
        const loadTime = Date.now() - startTime;
        setFastLoad(loadTime < 200);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user?.id]);

  const handleSave = async () => {
    if (!isOwnProfile) return;
    
    try {
      await updateProfile({
        name: profileData.name,
        bio: profileData.bio,
        about: profileData.about,
        program: profileData.program,
        section: profileData.section,
        batch: profileData.batch,
        hobby: profileData.hobby,
        website: profileData.website,
        instagram: profileData.instagram,
        linkedin: profileData.linkedin,
        twitter: profileData.twitter,
        avatar: profileData.avatar
      });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Refresh profile data
      if (profileUser) {
        setProfileUser({
          ...profileUser,
          display_name: profileData.name,
          bio: profileData.bio,
          about: profileData.about,
          program: profileData.program,
          section: profileData.section,
          batch: profileData.batch,
          hobby: profileData.hobby,
          website: profileData.website,
          instagram: profileData.instagram,
          linkedin: profileData.linkedin,
          twitter: profileData.twitter,
          avatar_url: profileData.avatar
        });
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (profileUser) {
      setProfileData({
        name: profileUser.display_name || '',
        bio: profileUser.bio || '',
        about: profileUser.about || '',
        program: profileUser.program || '',
        section: profileUser.section || '',
        batch: profileUser.batch || '',
        hobby: profileUser.hobby || '',
        website: profileUser.website || '',
        instagram: profileUser.instagram || '',
        linkedin: profileUser.linkedin || '',
        twitter: profileUser.twitter || '',
        avatar: profileUser.avatar_url || ''
      });
    }
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WebP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old avatar if exists
      if (profileUser?.avatar_url) {
        const oldPath = profileUser.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Image uploaded to:', publicUrl);

      // Update profile data AND immediately save to database
      setProfileData(prev => ({ ...prev, avatar: publicUrl }));
      
      // Also update the database immediately
      await updateProfile({ avatar: publicUrl });

      toast({
        title: "Image uploaded",
        description: "Your profile image has been uploaded and saved successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading && !fastLoad) {
    return (
      <div className="min-h-screen bg-background dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-1">
              <SkeletonProfile />
            </div>
            <div className="lg:col-span-2">
              <SkeletonProfile />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser && !loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">User not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900">
      <MinimalLoader show={!fastLoad && loading} />
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                {isOwnProfile ? 'Your Profile' : `${profileUser.display_name || 'User'}'s Profile`}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                {isOwnProfile ? 'Manage your personal information' : 'View user details'}
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex space-x-1 sm:space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} className="animate-fade-in text-xs sm:text-sm px-2 sm:px-4">
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="text-xs sm:text-sm px-2 sm:px-4">
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Cancel</span>
                    <span className="sm:hidden">×</span>
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="hover-scale text-xs sm:text-sm px-2 sm:px-4">
                  <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Avatar & Basic Info */}
          <div className="lg:col-span-1">
            <div className="bg-card dark:bg-gray-800/50 rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm border border-border/50">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 lg:h-32 lg:w-32 mx-auto mb-4 sm:mb-6 ring-4 ring-primary/10">
                <AvatarImage src={profileUser.avatar_url || undefined} alt={profileUser.display_name || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl lg:text-3xl">
                  {(profileUser.display_name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">
                {profileUser.display_name || 'Unknown User'}
              </h2>
              
              {/* Bio displayed below user name */}
              {profileUser.bio && (
                <p className="text-sm text-muted-foreground mb-3 italic">
                  "{profileUser.bio}"
                </p>
              )}
              
              {profileUser.is_admin && (
                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-primary/10 text-primary mb-3 sm:mb-4">
                  Administrator
                </span>
              )}

              {/* Contact Info */}
              <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-6 text-xs sm:text-sm">
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">{profileUser.email}</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>
                    Joined {new Date(profileUser.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                {profileUser.website && !isEditing && (
                  <div className="flex items-center justify-center space-x-2">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <a 
                      href={profileUser.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline truncate"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-6 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Profile Image</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="relative"
                      >
                        {uploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <span className="text-xs text-muted-foreground">
                        Max 5MB • JPEG, PNG, WebP, GIF
                      </span>
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="avatar-url" className="text-xs text-muted-foreground">Or paste URL:</Label>
                      <Input
                        id="avatar-url"
                        placeholder="https://example.com/avatar.jpg"
                        value={profileData.avatar}
                        onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Detailed Information */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="bg-card dark:bg-gray-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-border/50">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6 flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Name</Label>
                  {isEditing ? (
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base lg:text-lg font-medium text-foreground">{profileUser.display_name || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Program</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Enter your program"
                      value={profileData.program}
                      onChange={(e) => setProfileData(prev => ({ ...prev, program: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base lg:text-lg font-medium text-foreground">{profileUser.program || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Section</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Enter your section"
                      value={profileData.section}
                      onChange={(e) => setProfileData(prev => ({ ...prev, section: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base lg:text-lg font-medium text-foreground">{profileUser.section || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Batch</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Enter your batch"
                      value={profileData.batch}
                      onChange={(e) => setProfileData(prev => ({ ...prev, batch: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base lg:text-lg font-medium text-foreground">{profileUser.batch || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-card dark:bg-gray-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-border/50">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6 flex items-center">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Personal Information
              </h3>
              
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Hobby</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Enter your hobby"
                      value={profileData.hobby}
                      onChange={(e) => setProfileData(prev => ({ ...prev, hobby: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-foreground">{profileUser.hobby || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Website</Label>
                  {isEditing ? (
                    <Input
                      placeholder="https://example.com"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-foreground break-all">{profileUser.website || 'Not specified'}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Social Media</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Instagram</Label>
                      {isEditing ? (
                        <Input
                          placeholder="@username"
                          value={profileData.instagram}
                          onChange={(e) => setProfileData(prev => ({ ...prev, instagram: e.target.value }))}
                          className="mt-1 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="mt-1 text-sm sm:text-base text-foreground">{profileUser.instagram || 'Not specified'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                      {isEditing ? (
                        <Input
                          placeholder="linkedin.com/in/username"
                          value={profileData.linkedin}
                          onChange={(e) => setProfileData(prev => ({ ...prev, linkedin: e.target.value }))}
                          className="mt-1 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="mt-1 text-sm sm:text-base text-foreground">{profileUser.linkedin || 'Not specified'}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Twitter</Label>
                      {isEditing ? (
                        <Input
                          placeholder="@username"
                          value={profileData.twitter}
                          onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value }))}
                          className="mt-1 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="mt-1 text-sm sm:text-base text-foreground">{profileUser.twitter || 'Not specified'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      placeholder="A brief bio..."
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed">
                      {profileUser.bio || 'No bio available.'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">About</Label>
                  {isEditing ? (
                    <Textarea
                      placeholder="Tell us more about yourself..."
                      value={profileData.about}
                      onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                      className="mt-2 text-sm sm:text-base"
                      rows={4}
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed">
                      {profileUser.about || 'No additional information available.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Section - Only for own profile */}
            {isOwnProfile && !isEditing && (
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="mb-4"
                >
                  {showChangePassword ? 'Hide' : 'Change Password'}
                </Button>
                
                {showChangePassword && <ChangePasswordForm />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
