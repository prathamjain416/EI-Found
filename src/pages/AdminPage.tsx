
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users, Mail, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Mock allowlist management
const INITIAL_ALLOWLIST = [
  'admin@example.com',
  'user1@example.com', 
  'user2@example.com',
  'test@example.com'
];

const AdminPage = () => {
  const { user } = useAuth();
  const [allowlist, setAllowlist] = useState(INITIAL_ALLOWLIST);
  const [newEmail, setNewEmail] = useState('');

  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const email = newEmail.trim().toLowerCase();
    
    if (allowlist.includes(email)) {
      toast({
        title: "Email already exists",
        description: "This email is already in the allowlist.",
        variant: "destructive",
      });
      return;
    }

    setAllowlist(prev => [...prev, email]);
    setNewEmail('');
    toast({
      title: "Email added",
      description: `${email} has been added to the allowlist.`,
    });
  };

  const handleRemoveEmail = (email: string) => {
    setAllowlist(prev => prev.filter(e => e !== email));
    toast({
      title: "Email removed",
      description: `${email} has been removed from the allowlist.`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage community access and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allowed Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allowlist.length}</div>
            <p className="text-xs text-muted-foreground">Authorized for signup</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Signups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="allowlist" className="space-y-6">
        <TabsList>
          <TabsTrigger value="allowlist">Email Allowlist</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="allowlist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Email</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEmail} className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="newEmail" className="sr-only">Email address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allowed Emails ({allowlist.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allowlist.map((email) => (
                  <div key={email} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Allowed
                      </Badge>
                      <span className="font-medium">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {allowlist.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No emails in allowlist
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Registration Mode</h4>
                  <p className="text-sm text-gray-600">Currently set to allowlist-only</p>
                </div>
                <Badge>Restricted</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Chat History</h4>
                  <p className="text-sm text-gray-600">Messages are stored locally</p>
                </div>
                <Badge variant="outline">Local</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">User Profiles</h4>
                  <p className="text-sm text-gray-600">Members can edit their profiles</p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
