import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface CreditBundle {
  id: number;
  name: string;
  description: string;
  credits: number;
  price: number;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: CreditBundle | null;
  onPurchase: () => void;
  isPurchasing: boolean;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  bundle,
  onPurchase,
  isPurchasing,
}: PurchaseModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  if (!bundle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
            <ShoppingCart className="h-6 w-6 text-primary-600" />
          </div>
          <DialogTitle className="text-center">Purchase Credits</DialogTitle>
          <DialogDescription className="text-center">
            You've selected the {bundle.name} with {formatNumber(bundle.credits)} credits. Please enter your payment details to complete the purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <div className="rounded-md border border-gray-300 p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-medium text-gray-900">{bundle.name}</h4>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <ShoppingCart className="h-4 w-4 text-amber-500 mr-1" />
                  <span>{formatNumber(bundle.credits)} credits</span>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(bundle.price / 100)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700">Payment Method</Label>
              <div className="mt-1 flex space-x-2">
                <div className="border border-gray-300 rounded-md p-2 flex items-center justify-center w-16 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6">
                    <path d="M0 0v32h32V0H0z" fill="#fff"/>
                    <path d="M13 20h6v6h-6v-6z" fill="#ff5f00"/>
                    <path d="M14 26a7 7 0 0 1 0-14 7 7 0 0 0-7 7 7 7 0 0 0 7 7z" fill="#eb001b"/>
                    <path d="M21 19a7 7 0 0 1-7 7 7 7 0 0 0 7-7 7 7 0 0 0-7-7 7 7 0 0 1 7 7z" fill="#f79e1b"/>
                  </svg>
                </div>
                <div className="border border-gray-300 rounded-md p-2 flex items-center justify-center w-16 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6">
                    <path d="M0 0v32h32V0H0z" fill="#fff"/>
                    <path d="M21 4H11l-7 8v8l7 8h10l7-8v-8l-7-8z" fill="#00579f"/>
                    <path d="M13 16a8 8 0 0 0 6 0 8 8 0 0 0 0-8 8 8 0 0 0-6 0 8 8 0 0 0 0 8z" fill="#faa61a"/>
                  </svg>
                </div>
                <div className="border border-gray-300 rounded-md p-2 flex items-center justify-center w-16 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6">
                    <path d="M0 0v32h32V0H0z" fill="#fff"/>
                    <path d="M20 7.5a7.5 7.5 0 0 0-10 7.1v2.8h-3v4h3v10h4v-10h3.5l1-4h-4.5v-3c0-1.1.9-2 2-2h3V7.5h-2z" fill="#3b5998"/>
                  </svg>
                </div>
                <div className="border border-gray-300 rounded-md p-2 flex items-center justify-center w-16 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 text-gray-600">
                    <path d="M0 0v32h32V0H0z" fill="#fff"/>
                    <path d="M24 8H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-9 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="card-number">Card number</Label>
              <Input
                id="card-number"
                placeholder="1234 1234 1234 1234"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiration date</Label>
                <Input
                  id="expiry"
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={cvc}
                  onChange={e => setCvc(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPurchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={onPurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? "Processing..." : "Complete Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
