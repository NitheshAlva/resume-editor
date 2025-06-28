from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import docx
import fitz
from typing import Dict, Any ,List, Optional
from datetime import datetime
import google.generativeai as genai
from settings import settings
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print(settings)

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY) 
model = genai.GenerativeModel('gemini-1.5-flash')

class YearRange(BaseModel):
    start: int
    end: int


class ExperienceItem(BaseModel):
    company: str
    role: str
    description: str
    year: YearRange


class EducationItem(BaseModel):
    degree: str
    field: str
    year: YearRange


class Resume(BaseModel):
    id: str 
    title: str  
    name: str
    summary: Optional[str] = ''
    experience: List[ExperienceItem]
    education: List[EducationItem]  
    skills: List[str]
    suggestion: Optional[str] = ''
    createdAt: str
    updatedAt: str

class EnhanceRequest(BaseModel):
    content: str
    section: str
    
class SuggestRequest(BaseModel):
    content: str

class SaveRequest(BaseModel):
    resume: dict
class ResumeRequest(BaseModel):
    content: str

def read_resumes() -> List[Resume]:
    """Read resumes from the JSON file."""
    try:
        with open('resumes.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error reading resumes: {str(e)}")
saved_resumes = read_resumes() or []
print(f"Loaded {len(saved_resumes)} resumes from file.")

@app.get("/resumes")
def get_resumes():
    return saved_resumes

@app.get("/resume/{resume_id}")
def get_resume(resume_id: str):
    """Get a specific resume by ID."""
    for resume in saved_resumes:
        if resume['id'] == resume_id:
            return resume
    return {"found": False, "message": "Resume not found"}

@app.delete("/resume/{resume_id}")
def delete_resume(resume_id: str):
    """Delete a specific resume by ID."""
    global saved_resumes
    for i, resume in enumerate(saved_resumes):
        if resume['id'] == resume_id:
            del saved_resumes[i]
            try:
                with open('resumes.json', 'w') as f:
                    json.dump(saved_resumes, f, indent=4)
            except IOError as e:
                raise HTTPException(status_code=500, detail=f"Error deleting resume: {str(e)}")
            return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Resume not found")

@app.post("/save-resume")
def save_resume(data: Resume):
    """Save a resume to the JSON file."""
    global saved_resumes
    now = datetime.now().isoformat()
    if not data.id or not data.name:
        raise HTTPException(status_code=400, detail="Resume ID and name are required")
    if data.id not in [resume['id'] for resume in saved_resumes]:
        data.createdAt = now
        data.updatedAt = now
        saved_resumes.append(data.dict())
    else:
        for i, resume in enumerate(saved_resumes):
            if resume['id'] == data.id:
                data.updatedAt = now
                saved_resumes[i] = data.dict()
                break
    try:
        with open('resumes.json', 'w') as f:
            json.dump(saved_resumes, f, indent=4)
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Error saving resume: {str(e)}")
    
    return {"status": "saved"}

def create_resume_parsing_prompt(resume_text: str) -> str:
    """Create a structured prompt for Gemini to parse resume data."""
    prompt = f"""
        You are a resume parser. Extract the following information from the resume text and return it as a valid JSON object with this exact structure:

        {{
        "name": "Full name of the person",
        "summary": "Professional summary or objective (if available)",
        "experience": [
            {{
            "company": "Company name",
            "role": "Job title/position",
            "description": "Brief description of responsibilities",
            "year": {{
                "start": year_as_number,
                "end": year_as_number_or_null_if_current
            }}
            }}
        ],
        "education": [
            {{
            "degree": "Degree type",
            "field": "Field of study",
            "year": {{
                "start": year_as_number,
                "end": year_as_number
            }}
            }}
        ],
        "skills": ["skill1", "skill2", "skill3"]
        }}

        Important guidelines:
        1. Return ONLY valid JSON, no additional text or explanations
        2. If information is not available, use empty strings for text fields, empty arrays for lists, and null for missing years
        3. Extract all relevant skills including technical skills, programming languages, frameworks, tools, etc.
        4. For current positions, use null for the end year
        5. Parse years as numbers (e.g., 2020, not "2020")
        6. Keep descriptions concise but informative

        Resume text to parse:
        {resume_text}
    """
    return prompt

async def parse_with_gemini(content: str) -> Dict[str, Any]:
    try:
        prompt = create_resume_parsing_prompt(content)
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
        
        parsed_data = json.loads(response_text)
        return parsed_data
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Gemini response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {str(e)}")

@app.post("/parse-resume")
async def parse_resume(request:ResumeRequest):
    content = request.content.strip()
    try:
        if not content.strip():
            raise HTTPException(
                status_code=400, 
                detail="No text content could be extracted from the file."
            )
        
        parsed_resume = await parse_with_gemini(content)
        print(parsed_resume)
        return {
            "parsed_data": parsed_resume
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing file: {str(e)}"
        )

def build_enhancement_prompt(section: str, content: str) -> str:
    if section == "summary":
        return f"""
            You are an expert resume coach. Improve this professional summary or objective section to make it stronger and more appealing:

            Original:
            {content}

            Guidelines:
            - Make it engaging and tailored
            - Highlight key strengths and value offered to employers
            - Use professional, active language
            - Keep it concise (2-3 sentences)

            Return only the improved summary. Do not add extra text or explanations.
        """
    elif section == "experience":
        return f"""
            You are an expert resume editor. Improve this job experience bullet/paragraph to be more impactful:

            Original:
            {content}

            Guidelines:
            - Use strong action verbs
            - Add measurable impact (numbers if possible)
            - Emphasize accomplishments, not duties
            - Be concise but specific

            Return only the improved version. No headings or explanations.
        """
    else:
        raise ValueError("Unsupported section type. Use 'summary' or 'experience'.")

async def enhance_with_gemini(section: str, content: str) -> str:
    try:
        prompt = build_enhancement_prompt(section, content)
        response = model.generate_content(prompt)
        enhanced = response.text.strip()
        if not enhanced or len(enhanced) < 10:
            raise Exception("Empty or short result")
        return enhanced
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

@app.post("/ai-enhance")
async def ai_enhance(data: EnhanceRequest):
    section = data.section.strip().lower()
    if section not in ["summary", "experience"]:
        raise HTTPException(status_code=400, detail="Section must be 'summary' or 'experience'")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    enhanced = await enhance_with_gemini(section, data.content)
    return {
        "section": section,
        "original": data.content,
        "enhanced": enhanced,
    }

# def create_enhancement_prompt(section: str, content: str) -> str:
#     """Create section-specific prompts for different resume sections."""
    
#     prompts = {
#         "summary": f"""
# Enhance this professional summary/objective to make it more compelling and impactful:

# Original: {content}

# Guidelines:
# - Make it more engaging and professional
# - Highlight key strengths and value proposition
# - Use action-oriented language
# - Keep it concise (2-3 sentences)
# - Focus on what the candidate can offer to employers
# - Avoid generic phrases, be specific

# Return only the enhanced summary, no additional text or explanations.
# """,
        
#         "experience": f"""
# Enhance this work experience description to make it more impressive and quantifiable:

# Original: {content}

# Guidelines:
# - Use strong action verbs to start each point
# - Add quantifiable achievements where possible (use realistic estimates if specific numbers aren't provided)
# - Highlight impact and results
# - Use industry-relevant keywords
# - Make it more specific and detailed
# - Show progression and growth
# - Focus on accomplishments, not just duties

# Return only the enhanced experience description, no additional text or explanations.
# """,
        
#         "skills": f"""
# Enhance and organize this skills section to make it more comprehensive and appealing:

# Original: {content}

# Guidelines:
# - Group related skills together logically
# - Add relevant complementary skills that are commonly associated
# - Use current industry terminology
# - Include both technical and soft skills if applicable
# - Prioritize in-demand skills for the field
# - Make sure skills are specific rather than generic

# Return only the enhanced skills list, no additional text or explanations.
# """,
        
#         "education": f"""
# Enhance this education section to make it more impressive:

# Original: {content}

# Guidelines:
# - Highlight relevant coursework, projects, or achievements
# - Include GPA if it's strong (3.5+)
# - Mention relevant certifications or honors
# - Add details that show academic excellence or relevance to career goals
# - Include relevant extracurricular activities if space permits

# Return only the enhanced education description, no additional text or explanations.
# """,
        
#         "default": f"""
# Enhance this resume section to make it more professional and impactful:

# Original: {content}

# Guidelines:
# - Improve clarity and readability
# - Use professional language and tone
# - Make it more engaging and specific
# - Highlight key achievements and strengths
# - Use industry-appropriate terminology
# - Ensure proper grammar and structure

# Return only the enhanced content, no additional text or explanations.
# """
#     }
    
#     return prompts.get(section.lower(), prompts["default"])

# async def enhance_with_gemini(section: str, content: str) -> str:
#     """Use Gemini API to enhance resume content."""
#     try:
#         prompt = create_enhancement_prompt(section, content)
#         response = model.generate_content(prompt)
        
#         enhanced_content = response.text.strip()
        
#         # Basic validation to ensure we got meaningful content
#         if not enhanced_content or len(enhanced_content) < 10:
#             raise Exception("Generated content is too short or empty")
            
#         return enhanced_content
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Error enhancing content with Gemini API: {str(e)}"
#         )

# @app.post("/ai-enhance")
# async def ai_enhance(data: EnhanceRequest):
#     section = data.section.lower().strip()
#     if not data.content.strip() or section not in ["summary", "experience"]:
#         raise HTTPException(
#             status_code=400, 
#             detail="Invalid inputs"
#         )
    
#     try:
#         enhanced_content = await enhance_with_gemini(section, data.content)
#         return {
#             "section": data.section,
#             "original": data.content,
#             "enhanced": enhanced_content,
#             "improvement_applied": True
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         fallback_enhanced = f"Enhanced {data.section}: {data.content.strip()}"     
#         return {
#             "section": data.section,
#             "original": data.content,
#             "enhanced": fallback_enhanced,
#             "improvement_applied": False,
#             "error": "AI enhancement failed, using fallback",
#             "error_details": str(e)
#         }

@app.post("/ai-enhance-suggestions")
async def ai_enhance_suggestions(data: SuggestRequest):
    suggestions_prompt = f"""
        You are a professional resume consultant. Analyze the following resume content and provide a concise, paragraph-style summary of specific, actionable suggestions for improving the resume.

        Resume Content:
        {data.content}

        Your response should be 1-2 short paragraphs, each containing concrete suggestions with reasoning. Avoid generic advice and focus on improvements that enhance clarity, professionalism, structure, and relevance.

        Keep the tone helpful and constructive. The output should be suitable for display in a UI card or toast message.

        Begin your response now:
    """
    try:
        response = model.generate_content(suggestions_prompt)
        suggestions = response.text.strip()
        return {
            "content": data.content,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating suggestions: {str(e)}"
        )
