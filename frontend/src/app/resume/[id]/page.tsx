'use client'
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';  
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useParams, useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { ResumeSchema } from '@/lib/resume.schema';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  User, 
  Briefcase, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import backend_path from '@/lib/config';

const ResumeEditor = () => {
  const params = useParams();
  const id = typeof params.id === 'string'?params.id:'';
  const searchParams = useSearchParams();
  const title = searchParams.get('name') || 'Untitled Resume';
  const isNew = searchParams.get('isNew') === 'true';
  const hasExtractedData = searchParams.get('hasExtractedData') === 'true';

  const [enhancing, setEnhancing] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSkillDialog, setShowSkillDialog] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const form = useForm<z.infer<typeof ResumeSchema>>({
    resolver: zodResolver(ResumeSchema),
    defaultValues: {
      id: id,
      name: '',
      title: title,
      summary: '',
      experience: [],
      education: [],
      skills: [],
      suggestion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  const parseExtractedContent = async () => {
    if (!hasExtractedData || !window.tempResumeData) return;
    try {
      setIsLoading(true);
      toast.loading('Parsing your resume...', { id: 'parse' });
      const resp = await axios.post(backend_path+'/parse-resume', {
        content: window.tempResumeData.content
      });
      
      if (resp.data && resp.data.parsed_data) {
        const parsedData = resp.data.parsed_data;
        
        form.reset({
          id: id,
          title: title,
          name: parsedData.name || '',
          summary: parsedData.summary || '',
          experience: parsedData.experience || [],
          education: parsedData.education || [],
          skills: parsedData.skills || [],
          suggestion: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        delete window.tempResumeData;
        toast.success('Resume parsed successfully!', { id: 'parse' });
      }
    } catch (error) {
      console.error('Error parsing content:', error);
      toast.error('Failed to parse resume content', { id: 'parse' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResume = async (resumeId: string) => {
    try {
      setIsLoading(true);
      toast.loading('Loading resume...', { id: 'fetch' });
      
      const resp = await axios.get(backend_path+`/resume/${resumeId}`);
      const resumeData = resp.data;
      
      if (resumeData) {
        form.reset({
          ...resumeData,
          createdAt: resumeData.createdAt ? new Date(resumeData.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: resumeData.updatedAt ? new Date(resumeData.updatedAt).toISOString() : new Date().toISOString(),
        });
        toast.success('Resume loaded successfully!', { id: 'fetch' });
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
      toast.error('Failed to load resume', { id: 'fetch' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasExtractedData) {
      parseExtractedContent();
    } else if (!isNew && id) {
      fetchResume(id);
    }
  }, [id, hasExtractedData, isNew]);

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "experience"
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: "education"
  });

  const getAiSuggestion = async () => {
    try {
      setEnhancing(prev => ({ ...prev, suggestion: true }));
      toast.loading('Getting AI suggestions...', { id: 'suggestion' });
      
      const values = form.getValues();
      const content = JSON.stringify(values, null, 2);
      
      const resp = await axios.post(backend_path+'/ai-enhance-suggestions', {
        content: content,
      });
      
      if (resp.data && resp.data.suggestions) {
        form.setValue('suggestion', resp.data.suggestions);
        toast.success('AI suggestions received!', { id: 'suggestion' });
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast.error('Failed to get AI suggestions', { id: 'suggestion' });
    } finally {
      setEnhancing(prev => ({ ...prev, suggestion: false }));
    }
  };

  const onSubmit = async (data: z.infer<typeof ResumeSchema>) => {
    try {
      setIsSaving(true);
      toast.loading('Saving resume...', { id: 'save' });
      
      const resp = await axios.post(backend_path+'/save-resume', data);
      
      if (resp.status === 200) {
        const updatedData = {
          ...data,
          updatedAt: new Date().toISOString(),
        };
        form.reset(updatedData);
        toast.success('Resume saved successfully!', { id: 'save' });
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Failed to save resume', { id: 'save' });
    } finally {
      setIsSaving(false);
    }
  };

  const enhanceContent = async (section: string, content: string, index: number | null = null) => {
    const key = index !== null ? `${section}-${index}` : section;
    setEnhancing(prev => ({ ...prev, [key]: true }));

    try {
      const resp = await axios.post(backend_path+'/ai-enhance', {
        section: section,
        content: content
      });
      
      const enhanced = resp.data.enhanced;
      
      if (section === 'summary') {
        form.setValue('summary', enhanced);
      } else if (section === 'experience' && index !== null) {
        form.setValue(`experience.${index}.description`, enhanced);
      }
      
      toast.success('Content enhanced successfully!');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Failed to enhance content');
    } finally {
      setEnhancing(prev => ({ ...prev, [key]: false }));
    }
  };

  const addExperience = () => {
    appendExperience({
      company: '',
      role: '',
      description: '',
      year: {
        start: new Date().getFullYear(),
        end: new Date().getFullYear()
      }
    });
  };

  const addEducation = () => {
    appendEducation({
      degree: '',
      field: '',
      year: {
        start: new Date().getFullYear(),
        end: new Date().getFullYear()
      }
    });
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = form.getValues('skills');
      if (!currentSkills.includes(newSkill.trim())) {
        form.setValue('skills', [...currentSkills, newSkill.trim()]);
        toast.success(`"${newSkill}" added to skills`);
      } else {
        toast.error('Skill already exists');
      }
      setNewSkill('');
      setShowSkillDialog(false);
    }
  };

  const removeSkill = (index: number) => {
    const currentSkills = form.getValues('skills');
    const removedSkill = currentSkills[index];
    form.setValue('skills', currentSkills.filter((_, i) => i !== index));
    toast.success(`"${removedSkill}" removed`);
  };

  const handleDownload = () => {
    const data = form.getValues();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.title || 'resume'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Resume downloaded');
  };

  const deleteExperience = (index: number) => {
    const experience = form.getValues(`experience.${index}`);
    const company = experience.company || 'this experience';
    
    toast(`Delete ${company}?`, {
      action: {
        label: 'Delete',
        onClick: () => {
          removeExperience(index);
          toast.success('Experience deleted');
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    });
  };

  const deleteEducation = (index: number) => {
    const education = form.getValues(`education.${index}`);
    const degree = education.degree || 'this education';
    
    toast(`Delete ${degree}?`, {
      action: {
        label: 'Delete',
        onClick: () => {
          removeEducation(index);
          toast.success('Education deleted');
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center">
                <Button variant="ghost" type="button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          className="text-lg font-semibold border-2 p-1 h-auto"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                type="submit"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Resume'}
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        className="text-xl font-semibold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Write your professional summary..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => enhanceContent('summary', form.getValues('summary') || '')}
                disabled={enhancing.summary|| form.getValues('summary')?.trim() === ''}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {enhancing.summary ? 'Enhancing...' : 'Enhance with AI'}
              </Button>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Work Experience
                </span>
                <Button type="button" onClick={addExperience}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experience
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {experienceFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`experience.${index}.company`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`experience.${index}.role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Job Title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`experience.${index}.year.start`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Year</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Start Year" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`experience.${index}.year.end`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Year</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="End Year" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExperience(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`experience.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Job description and achievements..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => enhanceContent('experience', form.getValues(`experience.${index}.description`) || '', index)}
                    disabled={enhancing[`experience-${index}`]||form.getValues(`experience.${index}.description`)?.trim() === ''}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {enhancing[`experience-${index}`] ? 'Enhancing...' : 'Enhance with AI'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Education
                </span>
                <Button type="button" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Education
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {educationFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`education.${index}.degree`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Degree</FormLabel>
                            <FormControl>
                              <Input placeholder="Degree" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`education.${index}.field`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Field of Study</FormLabel>
                            <FormControl>
                              <Input placeholder="Field of Study" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`education.${index}.year.start`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Year</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Start Year" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`education.${index}.year.end`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Year</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="End Year" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEducation(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Skills
                <Dialog open={showSkillDialog} onOpenChange={setShowSkillDialog}>
                  <DialogTrigger asChild>
                    <Button type="button">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Skill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Skill</DialogTitle>
                      <DialogDescription>
                        Enter a skill to add to your resume
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="e.g., JavaScript, Python, Project Management..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSkillDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addSkill} disabled={!newSkill.trim()}>
                          Add Skill
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {form.watch('skills').map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestion Panel */}
          {form.getValues('suggestion') && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>AI Tips:</strong> {form.getValues('suggestion')}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={getAiSuggestion}
              disabled={enhancing.suggestion}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {enhancing.suggestion ? 'Getting Suggestions...' : 'Get AI Suggestions'}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Resume'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ResumeEditor;