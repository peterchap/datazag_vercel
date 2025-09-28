import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { CompanyAdminDashboardClient } from "@/components/client-admin/dashboard-client";
import { fetchCompanyUsers, fetchUsageData, fetchTransactions } from "@/lib/client-admin-server-data"; 

export default async function CompanyAdminDashboardPage() {
  const session = await auth();
  
  if (
    !session?.user || 
    (session.user.role !== USER_ROLES.CLIENT_ADMIN)
  ) {
    redirect("/dashboard"); 
  }

  // Fetch the initial list of users for the admin's company
  const initialCompanyUsers = await fetchCompanyUsers(session.user.id);

  // Keep IDs as strings (UUIDs should not be converted to numbers)
  const normalizedCompanyUsers = initialCompanyUsers.map((u) => ({
    ...u,
    id: String(u.id), // Ensure it's a string, don't convert to number
  }));

  // Find the admin user to get their credit balance
  const adminUser = normalizedCompanyUsers.find(user => 
    user.email === session.user.email && user.role === 'client_admin'
  );

  // Calculate company statistics with corrected logic
  const totalCredits = normalizedCompanyUsers.reduce((sum, user) => sum + (user.credits || 0), 0);
    const totalCreditsUsed = normalizedCompanyUsers.reduce((sum, user) => sum + (user.creditsUsed || 0), 0);
  // If the correct property is 'creditsUsed', update here. If not, replace with the actual property name.
  
  const companyStats = {
    totalUsers: normalizedCompanyUsers.length,
    totalCredits: totalCredits, // Sum of all users' current credits
    totalCreditsUsed: totalCreditsUsed, // Sum of all users' used credits
    availableCredits: totalCredits - totalCreditsUsed // Current credits minus used credits
  };

  console.log('Company stats being passed:', companyStats);
  console.log('Admin user found:', adminUser ? `${adminUser.firstName} ${adminUser.lastName} (${adminUser.credits} credits)` : 'Not found');
  const usageData = await fetchUsageData(session.user.company); // You'll need to implement this
  const transactions = await fetchTransactions(session.user.company); // You'll need to implement this
  return (
    <CompanyAdminDashboardClient 
      initialUsers={normalizedCompanyUsers} 
      companyStats={companyStats}
      initialUsageData={usageData}
      initialTransactions={transactions}
    />
  );
}