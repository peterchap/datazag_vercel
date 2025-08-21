'use client'

export const dynamic = 'force-dynamic';

import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, AlertCircle, BellRing, Mail, Lock, UserCog, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { USER_ROLES } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const securitySettingsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  apiUsageAlerts: z.boolean(),
  lowCreditAlerts: z.boolean(),
  marketingEmails: z.boolean(),
});

type SecuritySettingsFormValues = z.infer<typeof securitySettingsSchema>;
type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { logout, user, isAdmin } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Security settings form
  const securityForm = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Notification settings form
  const notificationForm = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      apiUsageAlerts: true,
      lowCreditAlerts: true,
      marketingEmails: false,
    },
  });
  
  const onSecuritySubmit = (data: SecuritySettingsFormValues) => {
    toast({
      title: "Password updated",
      description: "Your password has been updated successfully.",
    });
    securityForm.reset();
  };
  
  const onNotificationSubmit = (data: NotificationSettingsFormValues) => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const exportData = () => {
    toast({
      title: "Data export initiated",
      description: "Your data export has been started. You will receive an email when it's ready.",
    });
  };

  const deleteAccount = () => {
    // This would actually connect to an API to delete the account
    setShowDeleteDialog(false);
    toast({
      title: "Account deleted",
      description: "Your account has been successfully deleted.",
      variant: "destructive",
    });
    setTimeout(() => {
      logout();
    }, 2000);
  };
  
  return (
    <Layout
      title="Settings"
      description="Manage your account settings and preferences"
    >
      <Tabs defaultValue="account">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account information and connected services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Details</h3>
                <p className="text-sm text-gray-500">
                  Basic information about your account. To change your email address, please contact support.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user?.email || ""} disabled className="mt-1 bg-gray-50" />
                  </div>
                  <div>
                    <Label htmlFor="account-created">Account Created</Label>
                    <Input id="account-created" value="January 15, 2023" disabled className="mt-1 bg-gray-50" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch id="2fa" defaultChecked={false} />
                </div>
              </div>
              
              <Separator />
              
              {/* Connected Services - Only show for Business Admins */}
              {user?.role?.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase() && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Connected Services</h3>
                  <p className="text-sm text-gray-500">
                    Third-party payment services connected to your platform
                  </p>
                  
                  {/* Stripe */}
                  <div className="rounded-md border p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" fill="#6772E5"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Stripe</h4>
                        <p className="text-sm text-gray-500">Connected for credit card payments</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>

                  {/* PayPal */}
                  <div className="rounded-md border p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a9.036 9.036 0 0 1-.477 1.316c-1.165 5.122-5.043 6.5-10.002 6.5h-2.552c-.524 0-.968.382-1.05.9L5.997 21.337H1.390a.641.641 0 0 1-.633-.74L3.864.901C3.946.382 4.394 0 4.918 0h7.46c2.57 0 4.578.543 5.69 1.81.85.97 1.213 2.143 1.154 3.567z" fill="#0070ba"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">PayPal</h4>
                        <p className="text-sm text-gray-500">Connected for PayPal payments</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your current password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Password must be at least 8 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Update Password</Button>
                  </form>
                </Form>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">Session Management</h3>
                  <UserCog className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Manage your active sessions and sign out from all devices
                </p>
                
                <div className="rounded-md border p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Current Session</h4>
                      <p className="text-sm text-gray-500">Chrome on Windows • IP: 192.168.1.1</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
                
                <Button variant="outline">Sign Out From All Devices</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">API Key Security</h3>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">API Key Rotation Reminder</h4>
                    <p className="text-sm text-gray-500">
                      Get reminders to rotate your API keys periodically
                    </p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Every 30 days</SelectItem>
                      <SelectItem value="60">Every 60 days</SelectItem>
                      <SelectItem value="90">Every 90 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">Email Notifications</h3>
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive email notifications for account activity
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="apiUsageAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">API Usage Alerts</FormLabel>
                              <FormDescription>
                                Get notified when your API usage exceeds thresholds
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="lowCreditAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">Low Credit Alerts</FormLabel>
                              <FormDescription>
                                Get notified when your credit balance is running low
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="marketingEmails"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">Marketing Emails</FormLabel>
                              <FormDescription>
                                Receive updates about new features and promotions
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">Notification Preferences</h3>
                      <BellRing className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="credit-threshold">Low Credit Threshold</Label>
                        <Select defaultValue="100">
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select threshold" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50 credits</SelectItem>
                            <SelectItem value="100">100 credits</SelectItem>
                            <SelectItem value="200">200 credits</SelectItem>
                            <SelectItem value="500">500 credits</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="notification-frequency">Notification Frequency</Label>
                        <Select defaultValue="immediate">
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily digest</SelectItem>
                            <SelectItem value="weekly">Weekly summary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit">Save Notification Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Manage data, exports, and account deletion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Export</h3>
                <p className="text-sm text-gray-500">
                  Export all your data including API usage history, transactions, and account information
                </p>
                
                <Button variant="outline" onClick={exportData}>
                  Export Data
                </Button>
              </div>
              
              <Separator />
              
              {/* API Rate Limits - Business Admins Only */}
              {user?.role?.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase() && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">API Rate Limits</h3>
                    <p className="text-sm text-gray-500">
                      Configure custom rate limits for your API access
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requests-per-minute">Requests per minute</Label>
                        <Select defaultValue="100">
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select limit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">60 requests</SelectItem>
                            <SelectItem value="100">100 requests (default)</SelectItem>
                            <SelectItem value="200">200 requests</SelectItem>
                            <SelectItem value="500">500 requests</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="requests-per-day">Requests per day</Label>
                        <Select defaultValue="5000">
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select limit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1000">1,000 requests</SelectItem>
                            <SelectItem value="5000">5,000 requests (default)</SelectItem>
                            <SelectItem value="10000">10,000 requests</SelectItem>
                            <SelectItem value="25000">25,000 requests</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Higher rate limits may require a premium plan. Contact support for more information.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <Separator />
                </>
              )}
              {/* Admin Access Request System */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Admin Access</h3>
                
                {/* For regular users - Request Admin Access button */}
                {user?.role?.toLowerCase() === USER_ROLES.USER.toLowerCase() && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Request client admin access to manage your team members and settings
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // TODO: Implement admin request functionality
                        toast({
                          title: "Admin Access Requested",
                          description: "Your request has been submitted for review.",
                        });
                      }}
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Request Client Admin Access
                    </Button>
                  </div>
                )}
                
                {/* For client admins - Can authorize team members */}
                {user?.role?.toLowerCase() === USER_ROLES.CLIENT_ADMIN.toLowerCase() && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Manage admin access requests from your team members
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // TODO: Navigate to admin requests management page
                        toast({
                          title: "Admin Requests",
                          description: "Opening admin requests management...",
                        });
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Manage Team Admin Requests
                    </Button>
                  </div>
                )}
                
                {/* For business admins - Full admin request management */}
                {user?.role?.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase() && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Manage all admin access requests and authorize business administrators
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // TODO: Navigate to all admin requests page
                          toast({
                            title: "All Admin Requests",
                            description: "Opening admin requests management...",
                          });
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        View All Admin Requests
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // TODO: Navigate to business admin authorization page
                          toast({
                            title: "Business Admin Management",
                            description: "Opening business admin management...",
                          });
                        }}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Manage Business Admins
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-sm text-gray-500">
                  Permanently delete your account and all associated data
                </p>
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning: This action cannot be undone</AlertTitle>
                  <AlertDescription>
                    Deleting your account will permanently remove all your data, including API keys, usage history, and credits.
                  </AlertDescription>
                </Alert>
                
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-destructive flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-center">
              This action cannot be undone. This will permanently delete your account
              and remove all associated data from our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-md p-4 bg-destructive/5 text-destructive">
            <p className="text-sm">
              Please type <strong>DELETE</strong> to confirm account deletion
            </p>
            <Input 
              className="mt-2" 
              placeholder="Type DELETE to confirm"
              onChange={(e) => e.target.value === 'DELETE' ? 
                document.getElementById('confirm-delete-btn')?.removeAttribute('disabled') : 
                document.getElementById('confirm-delete-btn')?.setAttribute('disabled', 'true')}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              id="confirm-delete-btn"
              variant="destructive" 
              onClick={deleteAccount} 
              disabled={true}
            >
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
