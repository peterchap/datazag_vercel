'use client'

import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecoveryCodes } from "@/components/recovery-codes";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
});

const emailChangeSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailChangeFormValues = z.infer<typeof emailChangeSchema>;

export default function Profile() {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      company: user?.company || "",
    },
  });

  const emailChangeForm = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: "",
    },
  });
  
  const onSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      await apiRequest("PATCH", "/api/profile", data);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const onEmailChangeRequest = async (data: EmailChangeFormValues) => {
    setIsRequestingEmailChange(true);
    try {
      await apiRequest("POST", "/api/request-email-change", data);
      toast({
        title: "Verification email sent",
        description: `A verification email has been sent to ${data.newEmail}. Please check your inbox and click the verification link.`,
      });
      emailChangeForm.reset();
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Failed to request email change. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingEmailChange(false);
    }
  };
  
  return (
    <Layout
      title="Profile"
      description="Manage your account information and security settings"
    >
      <div className="max-w-3xl mx-auto">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and company details
                </CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Email address" {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? "Updating..." : "Update Profile"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Email Address</CardTitle>
                <CardDescription>
                  Request to change your email address. You'll need to verify the new email.
                </CardDescription>
              </CardHeader>
              <Form {...emailChangeForm}>
                <form onSubmit={emailChangeForm.handleSubmit(onEmailChangeRequest)}>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Current email: <strong>{user?.email}</strong>
                      </p>
                    </div>
                    
                    <FormField
                      control={emailChangeForm.control}
                      name="newEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter new email address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isRequestingEmailChange}>
                      {isRequestingEmailChange ? "Sending..." : "Send Verification Email"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <RecoveryCodes />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
