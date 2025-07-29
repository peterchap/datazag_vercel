import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";

interface DiscountCodeInputProps {
  originalAmount: number;
  onApplyDiscount: (code: string) => void;
  onClearDiscount: () => void;
  isValidating: boolean;
  validationResult?: {
    isValid: boolean;
    discountAmount: number;
    errorMessage?: string;
  };
  appliedCode?: string;
}

export default function DiscountCodeInput({
  originalAmount,
  onApplyDiscount,
  onClearDiscount,
  isValidating,
  validationResult,
  appliedCode,
}: DiscountCodeInputProps) {
  const [code, setCode] = useState("");
  
  const handleApply = () => {
    if (code) {
      onApplyDiscount(code);
    }
  };
  
  // If there's already an applied discount, show the summary
  if (appliedCode && validationResult?.isValid) {
    const discountedPrice = originalAmount - validationResult.discountAmount;
    
    return (
      <Card className="border-dashed border-green-300 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">Discount applied: {appliedCode}</span>
              </div>
              <div className="text-sm text-green-600 mt-1">
                You save {formatCurrency(validationResult.discountAmount / 100)}
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-500 line-through">
                  {formatCurrency(originalAmount / 100)}
                </span>
                <span className="ml-2 font-bold text-gray-900">
                  {formatCurrency(discountedPrice / 100)}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={onClearDiscount}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-2">
      <Label htmlFor="discount-code">Discount code</Label>
      <div className="flex space-x-2">
        <Input
          id="discount-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter discount code"
          className="uppercase"
          disabled={isValidating}
        />
        <Button 
          onClick={handleApply} 
          disabled={!code || isValidating}
          variant={validationResult?.isValid === false ? "destructive" : "default"}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {validationResult?.isValid === false && (
        <p className="text-sm text-destructive mt-1">
          {validationResult.errorMessage || "Invalid discount code"}
        </p>
      )}
    </div>
  );
}