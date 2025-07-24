import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const ProfileSetup = () => {
  const { updateProfile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    program: '',
    section: '',
    batch: '',
    hobby: '',
    website: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    about: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated successfully!",
        description: "Your profile has been set up.",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill in your details to complete your profile setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <Select onValueChange={(value) => handleSelectChange('program', value)} value={formData.program} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BBA">BBA</SelectItem>
                    <SelectItem value="B.Com">B.Com</SelectItem>
                    <SelectItem value="BCA">BCA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select onValueChange={(value) => handleSelectChange('section', value)} value={formData.section} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch">Batch *</Label>
                <Select onValueChange={(value) => handleSelectChange('batch', value)} value={formData.batch} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hobby">Hobby</Label>
                <Input
                  id="hobby"
                  name="hobby"
                  type="text"
                  value={formData.hobby}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Social Media</Label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="instagram" className="text-xs text-muted-foreground">Instagram</Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder="@username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin" className="text-xs text-muted-foreground">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    name="linkedin"
                    type="text"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    placeholder="linkedin.com/in/username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="text-xs text-muted-foreground">Twitter</Label>
                  <Input
                    id="twitter"
                    name="twitter"
                    type="text"
                    value={formData.twitter}
                    onChange={handleInputChange}
                    placeholder="@username"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                placeholder="Tell us a little about yourself..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                name="about"
                value={formData.about}
                onChange={handleInputChange}
                rows={4}
                placeholder="Tell us more about your interests, goals, or anything else..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;