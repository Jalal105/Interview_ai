const { GoogleGenAI } = require("@google/genai");
const { calculateResumeMatchScore } = require("./scoring.service");
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

// NOTE: matchScore is intentionally EXCLUDED from this schema.
// The numerical score is computed deterministically by scoring.service.js
// and injected into parsedData after Gemini returns qualitative analysis.
const interviewReportSchema = {
    type: "OBJECT",
    properties: {
        technicalQuestions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING", description: "The technical question" },
                    intention: { type: "STRING", description: "The intention behind this question" },
                    answer: { type: "STRING", description: "How to answer this question" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        behavioralQuestions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING", description: "The behavioral question" },
                    intention: { type: "STRING", description: "The intention behind this question" },
                    answer: { type: "STRING", description: "How to answer this question" }
                },
                required: ["question", "intention", "answer"]
            }
        },
        skillGaps: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    skill: { type: "STRING", description: "The skill which the candidate is lacking" },
                    severity: { type: "STRING", enum: ["low", "medium", "high"] }
                },
                required: ["skill", "severity"]
            }
        },
        preparationPlan: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    day: { type: "INTEGER", description: "Day number starting from 1" },
                    focus: { type: "STRING", description: "Focus of the day" },
                    tasks: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["day", "focus", "tasks"]
            }
        },
        title: {
            type: "STRING",
            description: "The job title"
        }
    },
    required: ["technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"]
};

const AVAILABLE_MODELS = ["gemini-2.5-flash", "gemini-3.6-flash"];

async function generateContentWithRetry(params, retries = 3, delay = 1000) {
    const requestedModel = params.model || "gemini-2.5-flash";
    const modelsToTry = [
        requestedModel,
        ...AVAILABLE_MODELS.filter(m => m !== requestedModel)
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        for (let i = 0; i < retries; i++) {
            try {
                return await ai.models.generateContent({
                    ...params,
                    model
                });
            } catch (err) {
                lastError = err;
                console.error(`Gemini API call with ${model} failed (attempt ${i + 1}/${retries}):`, err.message);

                const statusCode = err.status || err.statusCode || (err.error && err.error.code);
                const isTransient = statusCode === 503 || statusCode === 429 ||
                    err.message?.includes("experiencing high demand") ||
                    err.message?.includes("quota") ||
                    err.message?.includes("Service Unavailable") ||
                    !statusCode;

                if (isTransient && i < retries - 1) {
                    const backoff = delay * Math.pow(2, i);
                    console.log(`Waiting ${backoff}ms before retrying model call...`);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    continue;
                }
                // If model not found or permanently failed, break to next fallback model
                break;
            }
        }
    }

    throw lastError;
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: interviewReportSchema,
        }
    })

    const parsedData = JSON.parse(response.text);

    // --- Deterministic scoring (replaces AI-generated matchScore) ---
    // Gemini handles qualitative analysis only. The numerical score is
    // computed by a reproducible weighted formula, never by the LLM.
    const calculatedScore = calculateResumeMatchScore({ resume, selfDescription, jobDescription });
    parsedData.matchScore     = calculatedScore.finalScore;
    parsedData.scoreBreakdown = calculatedScore.breakdown;
    // ----------------------------------------------------------------

    console.log(parsedData);
    return parsedData;
}

function sanitizeResumeText(text) {
    if (!text) return "";
    return text
        // Remove markdown bold / italic / headers
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#+\s+/gm, "")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        // Standardize quotes and dashes for PDFKit WinAnsi
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\u2022/g, "*")
        .trim();
}

async function generateOptimizedResume({ resume, selfDescription, jobDescription }) {
    const prompt = `You are a professional resume writer. Generate a polished, professional resume (in plain text format) tailored to the target job description using the candidate's original resume and self-description. 
    Optimize the work experience bullet points, highlight relevant skills, and structure it cleanly with headers. 
    Do not use markdown formatting characters (like *, #, -, etc.) in the final output text; use standard caps and layout instead.
    
    Candidate Original Resume:
    ${resume}

    Candidate Self Description:
    ${selfDescription}

    Target Job Description:
    ${jobDescription}
    
    Output the tailored resume text directly.`

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const rawText = response.text || "";
        return sanitizeResumeText(rawText);
    } catch (err) {
        console.error("Failed to generate AI optimized resume with all models:", err.message);
        // Fallback: If AI fails due to quota or rate limits, generate a formatted version from the candidate's resume
        if (resume && resume.trim().length > 0) {
            console.log("Using formatted original resume as fallback due to AI service limit.");
            return sanitizeResumeText(resume);
        }
        throw err;
    }
}

const structuredResumeSchema = {
    type: "OBJECT",
    properties: {
        personalInfo: {
            type: "OBJECT",
            properties: {
                fullName: { type: "STRING", description: "Candidate's real full name from resume" },
                title: { type: "STRING", description: "Target professional job title tailored to the job description" },
                email: { type: "STRING", description: "Candidate email" },
                phone: { type: "STRING", description: "Candidate phone number" },
                location: { type: "STRING", description: "City, State or Country" },
                linkedin: { type: "STRING", description: "LinkedIn URL or handle" },
                github: { type: "STRING", description: "GitHub or Portfolio URL" }
            },
            required: ["fullName", "title", "email"]
        },
        summary: {
            type: "STRING",
            description: "High-impact 3-4 sentence professional summary tailored to the target job description"
        },
        skills: {
            type: "ARRAY",
            description: "Categorized skills (e.g., Languages, Frameworks, Developer Tools, Databases, Core Competencies)",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING", description: "Skill domain category" },
                    items: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["category", "items"]
            }
        },
        experience: {
            type: "ARRAY",
            description: "Work history entries with achievement-driven bullet points",
            items: {
                type: "OBJECT",
                properties: {
                    role: { type: "STRING", description: "Job title" },
                    company: { type: "STRING", description: "Company or organization name" },
                    location: { type: "STRING", description: "City, State or Remote" },
                    startDate: { type: "STRING", description: "Start date (e.g. Jun 2022)" },
                    endDate: { type: "STRING", description: "End date or Present" },
                    highlights: {
                        type: "ARRAY",
                        description: "3-5 high-impact bullet points with action verbs and quantifiable metrics",
                        items: { type: "STRING" }
                    }
                },
                required: ["role", "company", "highlights"]
            }
        },
        projects: {
            type: "ARRAY",
            description: "Key projects demonstrating relevance to the target role",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING", description: "Project title" },
                    technologies: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    },
                    description: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["title", "description"]
            }
        },
        education: {
            type: "ARRAY",
            description: "Education degrees or qualifications",
            items: {
                type: "OBJECT",
                properties: {
                    degree: { type: "STRING", description: "Degree and major" },
                    institution: { type: "STRING", description: "University or institution name" },
                    location: { type: "STRING", description: "Location" },
                    graduationDate: { type: "STRING", description: "Graduation year or dates" }
                },
                required: ["degree", "institution"]
            }
        },
        certifications: {
            type: "ARRAY",
            items: { type: "STRING" }
        }
    },
    required: ["personalInfo", "summary", "skills", "experience", "education"]
};

async function generateStructuredResume({ resume, selfDescription, jobDescription }) {
    const prompt = `You are an executive resume writer and ATS optimization specialist.
Generate a structured, ATS-compliant, tailored professional resume in strict JSON format based on the candidate's original resume, self-description, and target job description.

Key Guidelines:
1. Contact Info: Extract candidate's real name, email, phone, location from the original resume. If not found, use clean professional defaults.
2. Title: Align the candidate's title with the target role in the job description.
3. Professional Summary: Write a compelling 3-4 sentence summary highlighting target keywords, years of relevant experience, and key value proposition.
4. Core Competencies / Skills: Group skills into 3-5 distinct categories (e.g., "Languages & Frameworks", "Developer Tools", "Databases & Cloud", "Architecture & Methodologies").
5. Work Experience: For each position, rewrite bullet points into action-oriented statements following the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]". Use strong verbs (Spearheaded, Architected, Engineered, Optimized, Delivered).
6. Projects: Highlight relevant technical projects with tech stacks and key impact bullets.
7. Tone: Professional, crisp, metric-driven, ATS keyword optimized. Do not include markdown formatting tokens like ** or * in the string values.

Candidate Original Resume:
${resume}

Candidate Self Description:
${selfDescription}

Target Job Description:
${jobDescription}
`;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: structuredResumeSchema
            }
        });

        const parsed = JSON.parse(response.text);
        // Ensure default themeColor if not set
        if (!parsed.themeColor) {
            parsed.themeColor = "#ff2d78";
        }
        return parsed;
    } catch (err) {
        console.error("Failed to generate structured resume via AI:", err.message);
        // Resilient fallback structure
        return {
            personalInfo: {
                fullName: "Candidate",
                title: "Software Professional",
                email: "contact@example.com",
                phone: "+1 (555) 000-0000",
                location: "Location",
                linkedin: "",
                github: ""
            },
            summary: selfDescription || "Dedicated and results-oriented professional with demonstrated experience in building scalable solutions.",
            skills: [
                { category: "Core Skills", items: ["Full Stack Development", "Problem Solving", "Agile Methodologies", "Git"] }
            ],
            experience: [
                {
                    role: "Software Developer",
                    company: "Technology Solutions",
                    location: "Remote",
                    startDate: "2022",
                    endDate: "Present",
                    highlights: [
                        "Engineered and maintained mission-critical application features improving performance and reliability.",
                        "Collaborated with cross-functional teams to deliver scalable software solutions aligned with business goals."
                    ]
                }
            ],
            projects: [],
            education: [
                { degree: "Bachelor of Science in Computer Science or Related Field", institution: "University", location: "City, State", graduationDate: "2022" }
            ],
            certifications: [],
            themeColor: "#ff2d78"
        };
    }
}

module.exports = {
    generateInterviewReport,
    generateOptimizedResume,
    generateStructuredResume,
    structuredResumeSchema
}