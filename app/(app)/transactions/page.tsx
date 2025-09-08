import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { fetchAllTransactions, fetchAllUsersForFilter, fetchAllCompaniesForFilter } from "@/lib/admin-server-data";
import { TransactionsClient } from "@/components/admin/transactions/transactions-client";

// This is the async Server Page for the admin transactions list.
export default async function AdminTransactionsPage() {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // Fetch all initial data in parallel for the best performance
  const [initialTransactions, users, companies] = await Promise.all([
    fetchAllTransactions(),
    fetchAllUsersForFilter(),
    fetchAllCompaniesForFilter(),
  ]);

  // Format the data for the filter components
  const usersForFilter = users.map(user => ({
    value: user.id.toString(),
    label: user.email,
  }));
  const companiesForFilter = companies.map(company => ({
    value: company,
    label: company,
  }));

  // Render the client component, passing all the initial data as props
  return (
    <TransactionsClient 
        initialTransactions={initialTransactions} 
        usersForFilter={usersForFilter}
        companiesForFilter={companiesForFilter}
    />
  );
}