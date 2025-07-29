'use client'

import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Info, AlertCircle, Key, Lock, Database, Terminal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiKeys } from "@/hooks/use-api-keys";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Documentation() {
  const { user } = useAuth();
  const { activeApiKeys } = useApiKeys();

  const codeExamples = {
    curl: `curl -X POST https://api.example.com/api/query \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"query": "SELECT * FROM customers WHERE region = \\"West\\" LIMIT 10"}'`,
    
    javascript: `// Using fetch
const response = await fetch('https://api.example.com/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    query: 'SELECT * FROM customers WHERE region = "West" LIMIT 10'
  })
});

const data = await response.json();
console.log(data);`,
    
    python: `import requests

url = "https://api.example.com/api/query"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}
payload = {
    "query": "SELECT * FROM customers WHERE region = \\"West\\" LIMIT 10"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print(data)`
  };

  return (
    <Layout
      title="API Documentation"
      description="Learn how to use our API to query your data"
    >
      {activeApiKeys.length === 0 && (
        <Alert variant="default" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No API Keys Found</AlertTitle>
          <AlertDescription>
            You'll need to create an API key before you can start making requests.{" "}
            <Link href="/api-keys" className="font-medium underline underline-offset-4">
              Create one now
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
          <TabsTrigger value="errors">Error Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>API Overview</CardTitle>
              <CardDescription>
                Our API provides access to our database with a simple credit-based system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-lg font-medium">Getting Started</h3>
                <p>
                  Our API allows you to query our database using a simple JSON interface. Each query costs a certain number of credits, which are deducted from your account.
                </p>
                
                <h3 className="text-lg font-medium">Credit System</h3>
                <p>
                  Credits are used to pay for API requests. Different operations cost a different amount of credits:
                </p>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Credits Cost</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Basic Query</TableCell>
                      <TableCell>3 credits</TableCell>
                      <TableCell>Simple database query with limited results</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Advanced Query</TableCell>
                      <TableCell>5 credits</TableCell>
                      <TableCell>Complex queries with joins or aggregations</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Data Export</TableCell>
                      <TableCell>15 credits</TableCell>
                      <TableCell>Exporting large datasets in various formats</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Bulk Operations</TableCell>
                      <TableCell>25 credits</TableCell>
                      <TableCell>Processing multiple records in a single request</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <h3 className="text-lg font-medium">Rate Limits</h3>
                <p>
                  To ensure service availability for all users, our API implements rate limiting:
                </p>
                <ul>
                  <li>Maximum of 100 requests per minute</li>
                  <li>Maximum of 5,000 requests per day</li>
                  <li>Individual large queries may be subject to additional limits</li>
                </ul>
                
                <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                  <h4 className="text-base font-medium flex items-center text-primary-700">
                    <Info className="h-4 w-4 mr-2" /> Need More Capacity?
                  </h4>
                  <p className="text-primary-700 text-sm mt-1">
                    If you require higher limits for your enterprise applications, please contact our support team for custom plans.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Secure your API requests with API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-lg font-medium flex items-center">
                  <Key className="h-5 w-5 mr-2 text-primary-600" /> API Keys
                </h3>
                <p>
                  All requests to our API must include an API key for authentication. API keys are passed in the request header.
                </p>
                
                <div className="bg-muted p-4 rounded-md">
                  <code>Authorization: Bearer YOUR_API_KEY</code>
                </div>
                
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Secure Your API Keys</AlertTitle>
                  <AlertDescription>
                    Keep your API keys secure and never expose them in client-side code. If a key is compromised, revoke it immediately and create a new one.
                  </AlertDescription>
                </Alert>
                
                <h3 className="text-lg font-medium mt-6">Managing API Keys</h3>
                <p>
                  You can create and manage your API keys in the{" "}
                  <Link href="/api-keys" className="font-medium text-primary-600">
                    API Keys
                  </Link>{" "}
                  section of your dashboard. We recommend:
                </p>
                
                <ul>
                  <li>Creating separate keys for different applications or environments</li>
                  <li>Rotating keys periodically for enhanced security</li>
                  <li>Revoking unused or compromised keys immediately</li>
                </ul>
                
                <div className="flex justify-center mt-6">
                  <Link href="/api-keys">
                    <Button>
                      <Key className="mr-2 h-4 w-4" /> Manage API Keys
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Available endpoints and their usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800 mr-2">
                      POST
                    </span>
                    <h3 className="text-lg font-medium inline-block">/api/query</h3>
                  </div>
                  <p className="mt-2">Execute a database query and return the results.</p>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Request</h4>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-sm">
                          {JSON.stringify({
                            query: "SELECT * FROM customers WHERE region = 'West' LIMIT 10"
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Response</h4>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-sm">
                          {JSON.stringify({
                            success: true,
                            message: "Query executed successfully",
                            data: [
                              { id: 101, name: "John Smith", region: "West", sales: 25000 },
                              { id: 102, name: "Jane Doe", region: "West", sales: 34000 }
                            ],
                            credits_used: 3,
                            credits_remaining: 497
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="font-medium mt-6">Parameters</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>query</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>SQL query to execute</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>parameters</TableCell>
                        <TableCell>object</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>Query parameters for parameterized queries</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>format</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>Response format: json (default), csv, xlsx</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                
                <Separator className="my-8" />
                
                <div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800 mr-2">
                      GET
                    </span>
                    <h3 className="text-lg font-medium inline-block">/api/schema</h3>
                  </div>
                  <p className="mt-2">Retrieve the database schema information. Costs 1 credit.</p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">Response</h4>
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-sm">
                        {JSON.stringify({
                          success: true,
                          message: "Schema retrieved successfully",
                          data: {
                            tables: [
                              {
                                name: "customers",
                                columns: [
                                  { name: "id", type: "integer", primary_key: true },
                                  { name: "name", type: "text", nullable: false },
                                  { name: "region", type: "text", nullable: true },
                                  { name: "sales", type: "numeric", nullable: true }
                                ]
                              },
                              {
                                name: "orders",
                                columns: [
                                  { name: "id", type: "integer", primary_key: true },
                                  { name: "customer_id", type: "integer", foreign_key: "customers.id" },
                                  { name: "order_date", type: "timestamp", nullable: false },
                                  { name: "amount", type: "numeric", nullable: false }
                                ]
                              }
                            ]
                          },
                          credits_used: 1,
                          credits_remaining: 499
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Example code snippets for different programming languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList className="mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                
                <TabsContent value="curl">
                  <div className="bg-muted p-4 rounded-md relative">
                    <button 
                      className="absolute top-2 right-2 p-1 rounded-md bg-muted-foreground/10 hover:bg-muted-foreground/20"
                      onClick={() => {
                        navigator.clipboard.writeText(codeExamples.curl);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto">
                      <code>{codeExamples.curl}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="javascript">
                  <div className="bg-muted p-4 rounded-md relative">
                    <button 
                      className="absolute top-2 right-2 p-1 rounded-md bg-muted-foreground/10 hover:bg-muted-foreground/20"
                      onClick={() => {
                        navigator.clipboard.writeText(codeExamples.javascript);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto">
                      <code>{codeExamples.javascript}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="python">
                  <div className="bg-muted p-4 rounded-md relative">
                    <button 
                      className="absolute top-2 right-2 p-1 rounded-md bg-muted-foreground/10 hover:bg-muted-foreground/20"
                      onClick={() => {
                        navigator.clipboard.writeText(codeExamples.python);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto">
                      <code>{codeExamples.python}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium">Using the Response</h3>
                <p className="text-gray-600 mt-2">
                  Responses include the data you requested, the number of credits used for the query, and your remaining credit balance. Always check the <code>success</code> field to verify that your query executed correctly.
                </p>
                
                <div className="bg-primary-50 p-4 rounded-md mt-4 border border-primary-100">
                  <h4 className="font-medium flex items-center text-primary-700">
                    <Terminal className="h-4 w-4 mr-2" /> SDK Coming Soon
                  </h4>
                  <p className="text-primary-700 text-sm mt-1">
                    We're working on official SDKs for popular programming languages to make integration even easier. Stay tuned for updates!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Handling</CardTitle>
              <CardDescription>
                Understanding API errors and how to handle them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-lg font-medium">Error Responses</h3>
                <p>
                  When an error occurs, the API will return an appropriate HTTP status code along with a JSON response containing error details.
                </p>
                
                <div className="bg-muted p-4 rounded-md">
                  <pre className="text-sm">
                    {JSON.stringify({
                      success: false,
                      message: "Error executing query",
                      error_code: "QUERY_SYNTAX_ERROR",
                      details: "Syntax error near FROM clause"
                    }, null, 2)}
                  </pre>
                </div>
                
                <h3 className="text-lg font-medium mt-6">Common Error Codes</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Error Code</TableHead>
                      <TableHead>HTTP Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>INVALID_API_KEY</TableCell>
                      <TableCell>401</TableCell>
                      <TableCell>The API key provided is invalid or has been revoked</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>INSUFFICIENT_CREDITS</TableCell>
                      <TableCell>402</TableCell>
                      <TableCell>Your account has insufficient credits to perform this operation</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>QUERY_SYNTAX_ERROR</TableCell>
                      <TableCell>400</TableCell>
                      <TableCell>The SQL query syntax is invalid</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TABLE_NOT_FOUND</TableCell>
                      <TableCell>404</TableCell>
                      <TableCell>The requested table does not exist</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>RATE_LIMIT_EXCEEDED</TableCell>
                      <TableCell>429</TableCell>
                      <TableCell>You have exceeded the rate limit for API requests</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>QUERY_TIMEOUT</TableCell>
                      <TableCell>408</TableCell>
                      <TableCell>The query took too long to execute</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>INTERNAL_ERROR</TableCell>
                      <TableCell>500</TableCell>
                      <TableCell>An unexpected error occurred on the server</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <h3 className="text-lg font-medium mt-6">Best Practices for Error Handling</h3>
                
                <ul>
                  <li>Always check the <code>success</code> field in the response</li>
                  <li>Implement proper exception handling around API calls</li>
                  <li>Add automatic retry logic for transient errors (e.g., rate limits)</li>
                  <li>Implement exponential backoff for retries</li>
                  <li>Log detailed error information for debugging</li>
                </ul>
                
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <Database className="h-4 w-4" />
                  <AlertTitle>Low Credits Warning</AlertTitle>
                  <AlertDescription>
                    When your credit balance falls below 100, the API will include a <code>credits_warning</code> field in responses. Consider purchasing more credits to avoid service interruption.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
