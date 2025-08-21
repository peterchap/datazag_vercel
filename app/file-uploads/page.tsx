'use client'

export const dynamic = 'force-dynamic'; // file uploads use client/session state

import { useState, useRef, useEffect } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
// removed react-query; using local state and events instead
import { FileIcon, UploadIcon, DownloadIcon, XIcon, Loader2 } from "lucide-react";
import { useCurrency } from "@/components/currency-selector";

interface FileUploadResponse {
  message: string;
  file?: {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  };
  files?: Array<{
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  }>;
  files_count?: number;
}

export default function FileUploads() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const multipleFileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { formatPrice } = useCurrency();

  // File uploads are now free - no credit costs

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, isBulk: boolean) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setSelectedFiles(files);
    }
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    if (singleFileInputRef.current) singleFileInputRef.current.value = "";
    if (multipleFileInputRef.current) multipleFileInputRef.current.value = "";
  };

  const uploadFiles = async (isBulk: boolean) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    // Check file sizes
    const maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${oversizedFiles.length} file(s) exceed the 2GB size limit.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      if (isBulk) {
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });
      } else {
        formData.append("file", selectedFiles[0]);
      }

      // Calculate total file size
      const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);

      // For large files, use XMLHttpRequest with progress tracking
      if (totalSize > 50 * 1024 * 1024) { // If over 50MB, use XHR with progress
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        // Promise wrapper for XHR
        const uploadPromise = new Promise<FileUploadResponse>((resolve, reject) => {
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(xhr.statusText || 'Upload failed'));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network error during upload'));
          };
          
          xhr.open('POST', isBulk ? '/api/upload/bulk' : '/api/upload/single');
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send(formData);
        });
        
        // Wait for the upload to complete
        const data = await uploadPromise;
        
        // Invalidate queries that might be affected by credit change
  window.dispatchEvent(new CustomEvent('refreshUserData'));
        
        toast({
          title: "Upload successful",
          description: isBulk 
            ? `${data.files_count} files uploaded successfully.`
            : `File "${data.file?.originalname}" uploaded successfully.`,
        });
        
        // Clear files after successful upload
        clearSelectedFiles();
      } else {
        // For smaller files, use the existing fetch approach with simulated progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev === null) return 10;
            return prev >= 90 ? 90 : prev + 10;
          });
        }, 300);

        const response = await apiRequest(
          "POST",
          isBulk ? "/api/upload/bulk" : "/api/upload/single",
          formData,
          false // Don't stringify FormData
        );

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (response.ok) {
          const data = await response.json();
          
          // Invalidate queries that might be affected by credit change
          window.dispatchEvent(new CustomEvent('refreshUserData'));
          
          toast({
            title: "Upload successful",
            description: isBulk 
              ? `${data.files_count} files uploaded successfully.`
              : `File "${data.file?.originalname}" uploaded successfully.`,
          });
          
          // Clear files after successful upload
          clearSelectedFiles();
        } else {
          const errorData = await response.json();
          toast({
            title: "Upload failed",
            description: errorData.message || "An error occurred during upload",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Upload error",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Calculate total file size
  const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
  const formattedSize = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <Layout title="File Uploads" description="Upload files for processing">
      <div className="container py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="single">Single File Upload</TabsTrigger>
              <TabsTrigger value="bulk">Bulk File Upload</TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground">
              Available Credits: <span className="font-bold text-primary">{user?.credits || 0}</span>
            </div>
          </div>
          
          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>Single File Upload</CardTitle>
                <CardDescription>
                  Upload a single file for processing. File uploads are now free!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUploading && activeTab === "single" && uploadProgress !== null && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Upload Progress</span>
                      <span className="text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {uploadProgress < 100 ? 'Uploading file...' : 'Processing file...'}
                    </p>
                  </div>
                )}
                <div className="grid gap-6">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 transition-colors hover:border-primary/50 cursor-pointer"
                    onClick={() => singleFileInputRef.current?.click()}
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="flex flex-col items-center">
                        <FileIcon className="h-10 w-10 text-primary mb-4" />
                        <p className="font-medium text-lg">{selectedFiles[0].name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFiles[0].size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelectedFiles();
                          }}
                        >
                          <XIcon className="h-4 w-4 mr-2" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="font-medium">Click to select a file</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or drag and drop it here
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          Supports files up to 2GB in size
                        </p>
                      </div>
                    )}
                    <Input
                      ref={singleFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, false)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  File uploads are free!
                </div>
                <Button 
                  onClick={() => uploadFiles(false)} 
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading && activeTab === "single" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading {uploadProgress !== null ? `(${uploadProgress}%)` : ""}
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk File Upload</CardTitle>
                <CardDescription>
                  Upload multiple files for batch processing. File uploads are now free!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUploading && activeTab === "bulk" && uploadProgress !== null && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Upload Progress</span>
                      <span className="text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {uploadProgress < 100 ? `Uploading ${selectedFiles.length} files...` : 'Processing files...'}
                    </p>
                  </div>
                )}
                <div className="grid gap-6">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 transition-colors hover:border-primary/50 cursor-pointer"
                    onClick={() => multipleFileInputRef.current?.click()}
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="flex flex-col items-center w-full">
                        <FileIcon className="h-10 w-10 text-primary mb-4" />
                        <p className="font-medium text-lg">{selectedFiles.length} files selected</p>
                        <p className="text-sm text-muted-foreground">
                          Total size: {formattedSize} MB
                        </p>
                        
                        <div className="mt-4 w-full max-h-40 overflow-y-auto">
                          <ul className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <li key={index} className="flex justify-between text-sm p-2 bg-muted rounded">
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelectedFiles();
                          }}
                        >
                          <XIcon className="h-4 w-4 mr-2" /> Remove All
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="font-medium">Click to select multiple files</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or drag and drop them here
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          Supports files up to 2GB in size, 10 files maximum
                        </p>
                      </div>
                    )}
                    <Input
                      ref={multipleFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedFiles.length > 0 ? (
                    <>
                      {selectedFiles.length} file(s) selected - uploads are free!
                    </>
                  ) : (
                    <>
                      File uploads are free!
                    </>
                  )}
                </div>
                <Button 
                  onClick={() => uploadFiles(true)} 
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading && activeTab === "bulk" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading {uploadProgress !== null ? `(${uploadProgress}%)` : ""}
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
