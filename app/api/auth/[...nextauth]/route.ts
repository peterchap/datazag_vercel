import { handlers } from "@/lib/auth";

if (!handlers || !handlers.GET || !handlers.POST) {
  throw new Error("handlers object with GET and POST is required from '@/lib/auth'");
}

export const { GET, POST } = handlers;

