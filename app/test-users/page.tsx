'use client';

export const dynamic = 'force-dynamic'; // interactive test users page

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  company: string;
  canPurchaseCredits: boolean;
  credits: number;
}

interface TestResult {
  success: boolean;
  users?: User[];
  testCredentials?: {
    password: string;
    users: Array<{
      email: string;
      role: string;
      company: string;
      description: string;
    }>;
  };
  summary?: {
    total: number;
    businessAdmins: number;
    clientAdmins: number;
    regularUsers: number;
  };
  error?: string;
}

export default function TestUsersPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const createTestUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-users-sql', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to create test users'
      });
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-users-sql');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setResult(data);
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to fetch users'
      });
    }
    setLoading(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'business_admin':
        return 'destructive';
      case 'client_admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'business_admin':
        return 'Business Admin';
      case 'client_admin':
        return 'Client Admin';
      case 'user':
        return 'User';
      default:
        return role;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Test Users Management</h1>
        <p className="text-muted-foreground">
          Create and verify test users for the 3-tier role system
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={createTestUsers} 
          disabled={loading}
          size="lg"
        >
          {loading ? 'Creating...' : 'Create Test Users'}
        </Button>
        <Button 
          onClick={fetchUsers} 
          disabled={loading}
          variant="outline"
          size="lg"
        >
          {loading ? 'Loading...' : 'Fetch All Users'}
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>✅ Success</>
              ) : (
                <>❌ Error</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {result.testCredentials && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Test Login Credentials</h3>
                    <p className="text-blue-700 mb-3">
                      <strong>Password for all test users:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{result.testCredentials.password}</code>
                    </p>
                    <div className="space-y-2">
                      {result.testCredentials.users.map((user, index) => (
                        <div key={index} className="text-sm">
                          <strong>{user.email}</strong> ({user.company}) - {user.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.summary && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{result.summary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-2xl font-bold text-red-600">{result.summary.businessAdmins}</div>
                      <div className="text-sm text-muted-foreground">Business Admins</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{result.summary.clientAdmins}</div>
                      <div className="text-sm text-muted-foreground">Client Admins</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{result.summary.regularUsers}</div>
                      <div className="text-sm text-muted-foreground">Regular Users</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                {result.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{user.name}</span>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email} • {user.company}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm">
                      Credits: <span className="font-mono">{user.credits}</span>
                    </div>
                    <div className="text-xs">
                      Purchase: {user.canPurchaseCredits ? (
                        <span className="text-green-600">✅ Yes</span>
                      ) : (
                        <span className="text-red-600">❌ No</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Create Test Users:</strong> Click "Create Test Users" to populate the database with test accounts
          </div>
          <div>
            <strong>2. Test Authentication:</strong> Go to the login page and test with:
            <ul className="ml-4 mt-1 space-y-1">
              <li>• <code>admin@datazag.com</code> (Business Admin - Full platform access)</li>
              <li>• <code>admin@acme.com</code> (Client Admin - Company management)</li>
              <li>• <code>user@acme.com</code> (Regular User - Limited access)</li>
            </ul>
          </div>
          <div>
            <strong>3. Test Role Permissions:</strong> Verify each role has appropriate access to:
            <ul className="ml-4 mt-1 space-y-1">
              <li>• User management pages</li>
              <li>• Credit purchasing functionality</li>
              <li>• API key generation</li>
              <li>• Company-specific data access</li>
            </ul>
          </div>
          <div>
            <strong>4. Test Company Isolation:</strong> Ensure users only see their company's data
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
