const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const interviewReportSchema = {
    type: "OBJECT",
    properties: {
        matchScore: {
            type: "INTEGER",
            description: "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
        },
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
    required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"]
};

async function generateContentWithRetry(params, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent(params);
        } catch (err) {
            console.error(`Gemini API call failed (attempt ${i + 1}/${retries}):`, err.message);
            
            // Extract HTTP status code if available
            const statusCode = err.status || err.statusCode || (err.error && err.error.code);
            
            // 503 is Service Unavailable, 429 is Too Many Requests / Quota Exceeded.
            // Spikes in demand or transient rate limit issues are safe to retry.
            const isTransient = statusCode === 503 || statusCode === 429 ||
                                err.message?.includes("experiencing high demand") ||
                                err.message?.includes("quota") ||
                                err.message?.includes("Service Unavailable") ||
                                !statusCode; // Network or connection errors
            
            if (isTransient && i < retries - 1) {
                const backoff = delay * Math.pow(2, i);
                console.log(`Waiting ${backoff}ms before retrying model call...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                continue;
            }
            throw err;
        }
    }
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
    console.log(parsedData);
    return parsedData;
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

    const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt
    })

    return response.text
}

module.exports = { generateInterviewReport, generateOptimizedResume }