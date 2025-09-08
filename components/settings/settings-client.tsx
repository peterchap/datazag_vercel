'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecoveryCodes } from "@/components/recovery-codes";
import type { User } from "@/shared/schema";
import { Loader2 } from "lucide-react";

// --- Form Schemas ---
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
});
const emailChangeSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
});
type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailChangeFormValues = z.infer<typeof emailChangeSchema>;
// --- End Schemas ---

export function ProfileClient({ initialUser }: { initialUser: User | null }) {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const { toast } = useToast();

  const currentUser = user || initialUser;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: currentUser?.firstName || "",
      lastName: currentUser?.lastName || "",
      company: currentUser?.company || "",
    },
    // This ensures the form values update if the user data changes
    values: {
        firstName: currentUser?.firstName || "",
        lastName: currentUser?.lastName || "",
        company: currentUser?.company || "",
    }
  });

  const emailChangeForm = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: "" },
  });
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      await apiRequest("PATCH", "/api/profile", data);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Profile updated", description: "Your profile information has been updated successfully." });
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const onEmailChangeRequest = async (data: EmailChangeFormValues) => {
    setIsRequestingEmailChange(true);
    try {
      await apiRequest("POST", "/api/request-email-change", data);
      toast({ title: "Verification email sent", description: `A verification email has been sent to ${data.newEmail}.` });
      emailChangeForm.reset();
    } catch (error: any) {
      toast({ title: "Request failed", description: error.message || "Failed to request email change.", variant: "destructive" });
    } finally {
      setIsRequestingEmailChange(false);
    }
  };
  
  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
            Manage your account information and security settings.
        </p>

        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal and company details.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onProfileSubmit)}>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <FormField control={form.control} name="company" render={({ field }) => ( <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    {isUpdating ? "Updating..." : "Update Profile"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </TabsContent>
            
            <TabsContent value="email">
                <Card>
                    <CardHeader>
                        <CardTitle>Change Email Address</CardTitle>
                        <CardDescription>Request to change your email address. You will need to verify the new email.</CardDescription>
                    </CardHeader>
                    <Form {...emailChangeForm}>
                        <form onSubmit={emailChangeForm.handleSubmit(onEmailChangeRequest)}>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">Current email: <strong>{currentUser?.email}</strong></p>
                                <FormField control={emailChangeForm.control} name="newEmail" render={({ field }) => ( <FormItem><FormLabel>New Email Address</FormLabel><FormControl><Input type="email" placeholder="Enter new email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isRequestingEmailChange}>
                                     {isRequestingEmailChange && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    {isRequestingEmailChange ? "Sending..." : "Send Verification Email"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-6">
                {currentUser?.id && <RecoveryCodes userId={Number(currentUser.id)} />}
            </TabsContent>
        </Tabs>
    </div>
  );
}