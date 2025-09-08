import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Please read our terms of service carefully
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          <div className="prose prose-sm max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Datazag services, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            
            <h2>2. Service Description</h2>
            <p>
              Datazag provides data analytics and API services. We reserve the right to modify or discontinue the service at any time.
            </p>
            
            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            
            <h2>4. Acceptable Use</h2>
            <p>
              You agree not to use the service for any unlawful purpose or in any way that could damage, disable, overburden, or impair our servers or networks.
            </p>
            
            <h2>5. Payment Terms</h2>
            <p>
              Credits purchased are non-refundable. You agree to pay all fees and charges incurred in connection with your account.
            </p>
            
            <h2>6. Data Privacy</h2>
            <p>
              We collect and process personal data as described in our Privacy Policy. By using our service, you consent to such processing.
            </p>
            
            <h2>7. Intellectual Property</h2>
            <p>
              All content and technology on our platform is owned by Datazag and protected by intellectual property laws.
            </p>
            
            <h2>8. Limitation of Liability</h2>
            <p>
              Datazag shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>
            
            <h2>9. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violation of these terms or for any other reason.
            </p>
            
            <h2>10. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws.
            </p>
            
            <h2>11. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at legal@Datazag.com.
            </p>
            
            <p className="text-sm text-muted-foreground mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}