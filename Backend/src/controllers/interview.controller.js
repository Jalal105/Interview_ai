const pdfParse = require("pdf-parse")
const PDFDocument = require("pdfkit")
const mongoose = require("mongoose")

const { generateInterviewReport, generateOptimizedResume, generateStructuredResume } = require("../services/ai.services")
const { generateResumePdfBuffer } = require("../services/resumePdfGenerator")
const interviewReportModel = require("../models/interviewReport.model")


async function genarateInterViewReportController(req, res) {
    try {
        const resumeFile = req.file
        if (!resumeFile) {
            return res.status(400).json({ message: "Resume PDF file upload is required" })
        }

        const { selfDescription, jobDescription } = req.body
        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({ message: "Job description is required to generate interview report" })
        }

        // Converts the buffer into a Uint8Array, which is an array of bytes.
        //req.file.buffer This comes from middleware like Multer when a user uploads a file.
        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription: selfDescription || "",
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription: selfDescription || "",
            jobDescription,
            ...interViewReportByAi
        })

        // Pre-generate tailored structured resume in the background so it's ready when user navigates to the resume tab
        generateStructuredResume({
            resume: resumeContent.text,
            selfDescription: selfDescription || "",
            jobDescription
        }).then(async structuredResume => {
            await interviewReportModel.findByIdAndUpdate(interviewReport._id, { structuredResume });
            console.log(`Pre-generated structured resume for report ${interviewReport._id}`);
        }).catch(e => console.error("Background resume pre-generation error:", e.message));

        res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        })
    } catch (err) {
        console.error("Error generating interview report:", err)

        const statusCode = err.status || err.statusCode || (err.error && err.error.code) || 500
        const message = err.message || "Failed to generate interview report"

        res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
            message,
            error: err.toString()
        })
    }
}

async function getReportByIdController(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid report ID format" })
        }
        const interviewReport = await interviewReportModel.findById(id)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" })
        }

        if (interviewReport.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access" })
        }

        res.status(200).json({
            message: "Interview report fetched successfully",
            interviewReport
        })
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" })
    }
}

async function getAllReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 })
        res.status(200).json({
            message: "All interview reports fetched successfully",
            interviewReports
        })
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" })
    }
}

/**
 * Controller to fetch or generate structured resume data for interactive preview
 */
async function getResumeDataController(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid report ID format" })
        }
        const interviewReport = await interviewReportModel.findById(id)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" })
        }

        if (interviewReport.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access" })
        }

        // Return cached structured resume if available
        if (interviewReport.structuredResume) {
            return res.status(200).json({
                message: "Structured resume fetched successfully",
                structuredResume: interviewReport.structuredResume
            })
        }

        // Generate with AI and cache
        const structuredResume = await generateStructuredResume({
            resume: interviewReport.resume || "",
            selfDescription: interviewReport.selfDescription || "",
            jobDescription: interviewReport.jobDescription || ""
        })

        interviewReport.structuredResume = structuredResume
        await interviewReport.save().catch(e => console.error("Failed to save structured resume:", e))

        res.status(200).json({
            message: "Structured resume generated and cached successfully",
            structuredResume
        })
    } catch (err) {
        console.error("Error fetching structured resume data:", err)
        res.status(500).json({ message: err.message || "Server error fetching resume data" })
    }
}

/**
 * Controller to save user edits to their tailored resume
 */
async function updateResumeDataController(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid report ID format" })
        }
        const interviewReport = await interviewReportModel.findById(id)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" })
        }

        if (interviewReport.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access" })
        }

        const { structuredResume } = req.body
        if (!structuredResume) {
            return res.status(400).json({ message: "structuredResume is required" })
        }

        interviewReport.structuredResume = structuredResume
        await interviewReport.save()

        res.status(200).json({
            message: "Resume updated successfully",
            structuredResume: interviewReport.structuredResume
        })
    } catch (err) {
        console.error("Error updating structured resume data:", err)
        res.status(500).json({ message: err.message || "Server error updating resume" })
    }
}

/**
 * Controller to generate executive ATS PDF
 */
async function generateResumePdfController(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid report ID format" })
        }
        const interviewReport = await interviewReportModel.findById(id)

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" })
        }

        if (interviewReport.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access" })
        }

        let structuredResume = interviewReport.structuredResume
        if (!structuredResume) {
            structuredResume = await generateStructuredResume({
                resume: interviewReport.resume || "",
                selfDescription: interviewReport.selfDescription || "",
                jobDescription: interviewReport.jobDescription || ""
            })

            interviewReport.structuredResume = structuredResume
            await interviewReport.save().catch(saveErr => console.error("Failed to cache structured resume:", saveErr))
        }

        const themeColor = req.body?.themeColor || structuredResume.themeColor || "#ff2d78"

        const pdfBuffer = await generateResumePdfBuffer(structuredResume, themeColor)

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename=resume_${id}.pdf`)
        res.setHeader("Content-Length", pdfBuffer.length)
        return res.status(200).send(pdfBuffer)
    } catch (err) {
        console.error("PDF Generation error:", err)
        const statusCode = err.status || err.statusCode || (err.error && err.error.code) || 500
        const isClientError = statusCode >= 400 && statusCode < 500
        res.status(isClientError ? statusCode : 500).json({
            message: err.message || "Failed to generate resume PDF. Please try again."
        })
    }
}

module.exports = {
    genarateInterViewReportController,
    getReportByIdController,
    getAllReportsController,
    getResumeDataController,
    updateResumeDataController,
    generateResumePdfController
}