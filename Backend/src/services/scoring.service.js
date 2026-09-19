/**
 * scoring.service.js
 *
 * Deterministic, weighted resume-to-job-description match scoring.
 * Zero external dependencies — pure JavaScript arithmetic.
 *
 * Final Score Formula:
 *   finalScore = skillMatch*0.40 + experienceMatch*0.20 +
 *                projectMatch*0.15 + educationMatch*0.10 +
 *                keywordMatch*0.15
 *
 * All component scores and finalScore are integers in [0, 100].
 */

// ---------------------------------------------------------------------------
// 1. ALIAS / NORMALIZATION MAP
//    Maps common variations to a canonical lower-case token.
// ---------------------------------------------------------------------------
const SKILL_ALIASES = {
    "react.js":            "react",
    "reactjs":             "react",
    "node.js":             "node",
    "nodejs":              "node",
    "next.js":             "next",
    "nextjs":              "next",
    "express.js":          "express",
    "expressjs":           "express",
    "vue.js":              "vue",
    "vuejs":               "vue",
    "nuxt.js":             "nuxt",
    "nuxtjs":              "nuxt",
    "angular.js":          "angular",
    "angularjs":           "angular",
    "js":                  "javascript",
    "ts":                  "typescript",
    "postgres":            "postgresql",
    "psql":                "postgresql",
    "mongo":               "mongodb",
    "k8s":                 "kubernetes",
    "aws lambda":          "aws",
    "amazon web services": "aws",
    "gcp":                 "google cloud",
    "google cloud platform": "google cloud",
    "spring":              "spring boot",
    "ci/cd":               "ci cd",
    "restful":             "rest api",
    "rest":                "rest api",
    "graphql api":         "graphql",
    "ml":                  "machine learning",
    "ai":                  "artificial intelligence",
    "nlp":                 "natural language processing",
};

/**
 * Normalize a single skill token to its canonical lower-case form.
 * @param {string} raw
 * @returns {string}
 */
function normalizeSkill(raw) {
    const lower = raw.trim().toLowerCase();
    return SKILL_ALIASES[lower] || lower;
}

// ---------------------------------------------------------------------------
// 2. TEXT HELPERS
// ---------------------------------------------------------------------------

/** Build a combined candidate text corpus from resume + selfDescription. */
function candidateCorpus(resume, selfDescription) {
    return `${resume || ""} ${selfDescription || ""}`.trim().toLowerCase();
}

/**
 * Tokenize text into a Set of unique normalized words (>= 2 chars).
 * Used for keyword matching.
 */
function tokenSet(text) {
    return new Set(
        (text || "")
            .toLowerCase()
            .replace(/[^a-z0-9.\s]/g, " ")
            .split(/\s+/)
            .filter(t => t.length >= 2)
    );
}

/**
 * Extract a de-duplicated, normalized array of skills from a block of text.
 * Handles comma-separated lists, bullet points (•, -, *, ▪), and slashes.
 * Only tokens between 2 and 40 characters are kept.
 *
 * @param {string} text
 * @returns {string[]}  Array of unique normalized skill tokens
 */
function extractSkillsFromText(text) {
    if (!text || !text.trim()) return [];

    const cleaned = text
        .replace(/[•▪\-–|\/\\]/g, ",")
        .replace(/\*{1,2}/g, ",")
        .replace(/\n/g, ",");

    const raw = cleaned
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length >= 2 && s.length <= 40);

    const seen = new Set();
    const result = [];
    for (const token of raw) {
        const norm = normalizeSkill(token);
        if (!seen.has(norm)) {
            seen.add(norm);
            result.push(norm);
        }
    }
    return result;
}

/**
 * Extract years-of-experience requirements from text.
 * Returns the first matched integer, or null if none found.
 * @param {string} text
 * @returns {number|null}
 */
function extractYearsRequired(text) {
    if (!text) return null;
    const patterns = [
        /(?:minimum|at\s+least|min\.?)\s+(\d+)\+?\s+years?/i,
        /(\d+)\+\s+years?(?:\s+of)?(?:\s+experience)?/i,
        /(\d+)\s+years?\s+of\s+(?:experience|professional|work)/i,
        /experience(?:\s+of)?\s+(\d+)\+?\s+years?/i,
        /(\d+)\s*-\s*\d+\s+years?/i,
    ];
    for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

/**
 * Estimate candidate's years of experience from resume text.
 * Looks for date-range patterns and sums them, capped at 30.
 * @param {string} text
 * @returns {number}
 */
function estimateCandidateYears(text) {
    if (!text) return 0;

    const selfClaim = extractYearsRequired(text);
    if (selfClaim !== null) return selfClaim;

    const yearRanges = text.match(/\b(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|present|current)\b/gi) || [];
    let totalYears = 0;
    const currentYear = new Date().getFullYear();
    for (const range of yearRanges) {
        const years = range.match(/\b(20\d{2}|19\d{2})\b/g);
        if (!years) continue;
        const start = parseInt(years[0], 10);
        const endRaw = /present|current/i.test(range) ? currentYear : parseInt(years[years.length - 1], 10);
        const diff = endRaw - start;
        if (diff > 0 && diff < 40) totalYears += diff;
    }
    return Math.min(totalYears, 30);
}

/**
 * Map degree/qualification keywords to a numeric level (higher = more advanced).
 */
const DEGREE_LEVELS = [
    { level: 4, keywords: ["phd", "ph.d", "doctorate", "doctoral"] },
    { level: 3, keywords: ["master", "m.s", "ms ", "msc", "m.e", "m.tech", "mba"] },
    { level: 2, keywords: ["bachelor", "b.s", "bs ", "bsc", "b.e", "b.tech", "be ", "undergraduate", "b.sc"] },
    { level: 1, keywords: ["associate", "diploma", "certification", "a.s"] },
];

/**
 * Determine the highest degree level present in text (0 = none found).
 * @param {string} text
 * @returns {number}
 */
function extractDegreeLevel(text) {
    if (!text) return 0;
    const lower = text.toLowerCase();
    for (const { level, keywords } of DEGREE_LEVELS) {
        if (keywords.some(k => lower.includes(k))) return level;
    }
    return 0;
}

/** Clamp a value to [0, 100] and round to nearest integer. */
function clamp(val) {
    return Math.min(100, Math.max(0, Math.round(val)));
}

// ---------------------------------------------------------------------------
// 3. SUB-SCORERS
// ---------------------------------------------------------------------------

/**
 * SKILL MATCH — 40% weight
 *
 * Extracts required skills from the JD (skill section first, then full text).
 * Checks each JD skill against the candidate corpus using normalized matching.
 * Falls back to keyword overlap when no explicit skill list is found in the JD.
 *
 * @returns {number} 0–100
 */
function scoreSkillMatch(resume, selfDescription, jobDescription) {
    if (!jobDescription || !jobDescription.trim()) return 0;

    // Strategy 1: look for a dedicated skills / requirements section in the JD
    const sectionMatch = jobDescription.match(
        /(?:required\s+skills?|technical\s+skills?|qualifications?|requirements?|tech\s+stack|technologies?)[:\s]+([\s\S]{10,500}?)(?:\n{2,}|$)/i
    );
    const jdSkillSection = sectionMatch ? sectionMatch[1] : jobDescription;
    const jdSkills = extractSkillsFromText(jdSkillSection);

    // Fallback if we couldn't extract a meaningful skill list
    if (jdSkills.length === 0) {
        return scoreKeywordAlignment(resume, selfDescription, jobDescription);
    }

    const corpus = candidateCorpus(resume, selfDescription);
    const candidateSkillSet = new Set(extractSkillsFromText(corpus));

    let matched = 0;
    for (const jdSkill of jdSkills) {
        // Match via explicit skill list OR substring presence in full corpus
        if (candidateSkillSet.has(jdSkill) || corpus.includes(jdSkill)) {
            matched++;
        }
    }

    return clamp((matched / jdSkills.length) * 100);
}

/**
 * EXPERIENCE MATCH — 20% weight
 *
 * Scoring curve vs. required years gap:
 *   >= 0 (meets/exceeds)  → 100 (slight decay for extreme excess)
 *   gap = 1 year          → 60
 *   gap = 2 years         → 40
 *   gap = 3 years         → 25
 *   gap > 3 years         → 10
 *   No JD requirement     → 75 (neutral, benefit of doubt)
 *   No candidate data     → 30
 *
 * @returns {number} 0–100
 */
function scoreExperienceMatch(resume, selfDescription, jobDescription) {
    const corpus = candidateCorpus(resume, selfDescription);
    const required  = extractYearsRequired(jobDescription || "");
    const candidate = estimateCandidateYears(corpus);

    if (required === null) return candidate > 0 ? 75 : 60;
    if (candidate === 0 && required > 0) return 30;

    const gap = required - candidate; // positive → candidate is under
    if (gap <= 0)  return clamp(100 - Math.max(0, -gap - 2) * 2);
    if (gap === 1) return 60;
    if (gap === 2) return 40;
    if (gap === 3) return 25;
    return 10;
}

/**
 * PROJECT RELEVANCE — 15% weight
 *
 * Isolates the projects section from the resume and measures keyword + skill
 * overlap with the JD. Falls back to the full resume if no section is found.
 *
 * @returns {number} 0–100
 */
function scoreProjectRelevance(resume, selfDescription, jobDescription) {
    if (!resume || !jobDescription) return 50;

    const resumeLower = resume.toLowerCase();

    // Attempt to isolate a project section
    const projectSection = (() => {
        const m = resumeLower.match(
            /(?:projects?|personal\s+projects?|key\s+projects?|academic\s+projects?)[:\s]+([\s\S]{20,2000}?)(?:\n{3,}|education|experience|certifications|skills|$)/i
        );
        return m ? m[1] : resumeLower;
    })();

    const jdTokens      = tokenSet(jobDescription);
    const projectTokens = tokenSet(projectSection);

    if (jdTokens.size === 0) return 50;

    let tokenHits = 0;
    for (const token of jdTokens) {
        if (projectTokens.has(token)) tokenHits++;
    }

    // Extra bonus for recognized skill tokens appearing in projects
    const jdSkills = extractSkillsFromText(jobDescription);
    let skillHits  = 0;
    for (const s of jdSkills) {
        if (projectSection.includes(s)) skillHits++;
    }
    const skillBonus = jdSkills.length > 0 ? (skillHits / jdSkills.length) * 30 : 0;

    const baseRatio = tokenHits / jdTokens.size;
    return clamp(baseRatio * 70 + skillBonus);
}

/**
 * EDUCATION MATCH — 10% weight
 *
 * Lenient: if JD has no education requirement, candidate is not penalized.
 * Scoring:
 *   JD unspecified + candidate has degree → 85
 *   JD unspecified, no candidate info     → 70
 *   Candidate meets / exceeds             → 100
 *   One level below                       → 70
 *   Two levels below                      → 45
 *   Three levels below                    → 20
 *   JD requires but candidate unknown     → 50
 *
 * @returns {number} 0–100
 */
function scoreEducationMatch(resume, selfDescription, jobDescription) {
    const corpus        = candidateCorpus(resume, selfDescription);
    const requiredLevel = extractDegreeLevel(jobDescription || "");
    const candidateLevel = extractDegreeLevel(corpus);

    if (requiredLevel === 0) {
        return candidateLevel > 0 ? 85 : 70;
    }
    if (candidateLevel === 0) return 50;

    const delta = candidateLevel - requiredLevel;
    if (delta >= 0)  return 100;
    if (delta === -1) return 70;
    if (delta === -2) return 45;
    return 20;
}

/**
 * KEYWORD / REQUIREMENT ALIGNMENT — 15% weight
 *
 * De-duplicates JD keywords before scoring so repeated terms don't inflate.
 * Excludes common English stop-words and tokens shorter than 3 characters.
 *
 * @returns {number} 0–100
 */
const STOP_WORDS = new Set([
    "the","and","for","are","with","that","have","this","will","from",
    "they","been","has","had","not","but","can","you","our","your",
    "all","any","was","were","one","their","its","also","more","than",
    "we","or","an","in","of","to","a","is","it","at","as","be","by",
    "on","do","so","if","he","she","us","my","me","him","her","his",
    "who","what","when","which","there","about","into","than","them",
    "some","such","may","must","able","work","well","good","strong",
    "required","preferred","experience","skills","knowledge","using",
    "including","team","tools","across","within","based","etc"
]);

function scoreKeywordAlignment(resume, selfDescription, jobDescription) {
    if (!jobDescription || !jobDescription.trim()) return 0;

    const corpus = candidateCorpus(resume, selfDescription);

    const jdRawTokens = tokenSet(jobDescription);
    const jdKeywords  = new Set(
        [...jdRawTokens].filter(t => t.length >= 3 && !STOP_WORDS.has(t))
    );

    if (jdKeywords.size === 0) return 0;

    const candidateTokens = tokenSet(corpus);
    let hits = 0;
    for (const kw of jdKeywords) {
        if (candidateTokens.has(kw)) hits++;
    }

    return clamp((hits / jdKeywords.size) * 100);
}

// ---------------------------------------------------------------------------
// 4. MAIN EXPORT
// ---------------------------------------------------------------------------

/**
 * calculateResumeMatchScore
 *
 * Deterministic, weighted resume-to-job match scorer.
 * Produces a reproducible integer score in [0, 100] with a full breakdown.
 *
 * @param {Object} params
 * @param {string} params.resume          - Full resume text (extracted from PDF)
 * @param {string} params.selfDescription - Candidate's self-description (optional)
 * @param {string} params.jobDescription  - Full job description text
 *
 * @returns {{
 *   finalScore: number,
 *   breakdown: {
 *     skillMatch: number,
 *     experienceMatch: number,
 *     projectMatch: number,
 *     educationMatch: number,
 *     keywordMatch: number
 *   }
 * }}
 */
function calculateResumeMatchScore({ resume, selfDescription, jobDescription }) {
    // Safe defaults — never throw on missing input
    const r  = resume          || "";
    const sd = selfDescription || "";
    const jd = jobDescription  || "";

    const skillMatch      = scoreSkillMatch(r, sd, jd);
    const experienceMatch = scoreExperienceMatch(r, sd, jd);
    const projectMatch    = scoreProjectRelevance(r, sd, jd);
    const educationMatch  = scoreEducationMatch(r, sd, jd);
    const keywordMatch    = scoreKeywordAlignment(r, sd, jd);

    const weighted =
        skillMatch      * 0.40 +
        experienceMatch * 0.20 +
        projectMatch    * 0.15 +
        educationMatch  * 0.10 +
        keywordMatch    * 0.15;

    const finalScore = clamp(weighted);

    console.log("[ScoringService] Breakdown:", {
        skillMatch,
        experienceMatch,
        projectMatch,
        educationMatch,
        keywordMatch,
        finalScore
    });

    return {
        finalScore,
        breakdown: {
            skillMatch,
            experienceMatch,
            projectMatch,
            educationMatch,
            keywordMatch
        }
    };
}

module.exports = { calculateResumeMatchScore };
