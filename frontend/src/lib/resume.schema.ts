import { z } from 'zod';

// Nested schema for ExperienceItem
export const ExperienceItemSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role is required"),
  description: z.string(),
  year: z.object({
    start: z.number().min(1900, "Start year must be a valid year"),
    end: z.number().min(1900, "End year must be a valid year")
  }),
});

// Nested schema for EducationItem
export const EducationItemSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  field: z.string().min(1, "Field of study is required"),
  year: z.object({
    start: z.number().min(1900, "Start year must be a valid year"),
    end: z.number().min(1900, "End year must be a valid year")
  }),
});

// Main Resume schema
export const ResumeSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  name: z.string().min(1, "Name is required"),
  summary: z.string().optional(),
  experience: z.array(ExperienceItemSchema),
  education: z.array(EducationItemSchema),
  skills: z.array(z.string()),
  suggestion: z.string().optional(),
  createdAt: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid ISO date format",
  }),
  updatedAt: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid ISO date format",
  }),
});
