'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  FileText, 
  Calendar,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import axios from 'axios';
import { extractText } from '@/components/text-extractor';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ResumeSchema } from '@/lib/resume.schema';
import { z } from 'zod';

export default function Home() {
  const [resumes, setResumes] = useState<z.infer<typeof ResumeSchema>[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      try {
        const resp = await axios.get('http://localhost:8000/resumes');
        if (resp.data) {
          setResumes(resp.data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching resumes:', error);
        toast.error('Failed to load resumes');
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

    
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];
    if(!file) return;
    if(!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)){
      toast.error('Please upload a valid PDF or DOCX file');
      return;
    }
    setUploadLoading(true);
    toast.loading('Processing your resume...', { id: 'upload' });
    try {
      const content = await extractText(file);
      window.tempResumeData = {
        name: file.name,
        content,
        timestamp: Date.now()
      };
      
      createNewResume(file.name, true);
      toast.success('Resume processed successfully!', { id: 'upload' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process the file', { id: 'upload' });
    } finally {
      setUploadLoading(false);
    }
  };
      
  const createNewResume = (name: string = '', isNew: boolean = false) => {
    const resumeId = Date.now().toString();
    const params = new URLSearchParams({
      name: name,
      isNew: isNew.toString(),
      hasExtractedData: window.tempResumeData ? 'true' : 'false'
    });
    router.push(`/resume/${resumeId}?${params.toString()}`);
  };

  const deleteResume = async (id: string, title: string) => {
    toast('Are you sure you want to delete this resume?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await axios.delete(`http://localhost:8000/resume/${id}`);
            setResumes(resumes.filter(resume => resume.id !== id));
            toast.success(`"${title}" deleted successfully`);
          } catch (error) {
            console.error('Error deleting resume:', error);
            toast.error('Failed to delete resume');
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    });
  };

  const downloadResume = (resume: z.infer<typeof ResumeSchema>) => {
    const dataStr = JSON.stringify(resume, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Resume downloaded');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Dashboard</h1>
        </div>  
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant='default'>
              <Plus className="w-4 h-4 mr-2" />
              Create New Resume
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Resume</DialogTitle>
              <DialogDescription>
                Choose how you'd like to create your resume
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  createNewResume('', true);
                  setShowCreateDialog(false);
                }}
              >
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Start from blank template</div>
                  <div className="text-sm text-gray-500">Create a resume from scratch</div>
                </div>
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadLoading}
                />
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  disabled={uploadLoading}
                >
                  <div className="flex items-center">
                    {uploadLoading ? (
                      <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    ) : (
                      <Upload className="w-5 h-5 mr-3" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">
                        {uploadLoading ? 'Processing...' : 'Upload existing resume'}
                      </div>
                      <div className="text-sm text-gray-500">Upload PDF or DOCX file to parse</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-black"></div>
        </div>
      ) : (
        resumes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first resume</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <Card key={resume.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{resume.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteResume(resume.id, resume.title)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {resume.name || 'Unnamed Resume'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      {resume.experience?.length || 0} experiences
                    </div>
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {resume.education?.length || 0} educations
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Updated {new Date(resume.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/resume/${resume.id}`} className="flex-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadResume(resume)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    tempResumeData?: {
      name: string;
      content: string;
      timestamp: number;
    };
  }
} 