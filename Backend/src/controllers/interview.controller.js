const pdfParse = require("pdf-parse")
const PDFDocument = require("pdfkit")
const mongoose = require("mongoose")

const { generateInterviewReport, generateOptimizedResume } = require("../services/ai.services")
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

        const optimizedResumeText = await generateOptimizedResume({
            resume: interviewReport.resume || "",
            selfDescription: interviewReport.selfDescription || "",
            jobDescription: interviewReport.jobDescription || ""
        })

        // Generate PDF using PDFKit
        const doc = new PDFDocument({ margin: 50 })
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename=resume_${id}.pdf`)
        doc.pipe(res)

        // Title/Header
        doc.font("Helvetica-Bold").fontSize(22).fillColor("#ff2d78").text("TAILORED PROFESSIONAL RESUME", { align: "center" })
        doc.moveDown(0.5)
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#7d8590").text(`Generated for target: ${interviewReport.title || "Target Role"}`, { align: "center" })
        
        // Horizontal Divider Line
        doc.moveDown(1)
        doc.strokeColor("#2a3348").lineWidth(1)
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
        doc.moveDown(1.5)

        // Body Text
        doc.font("Helvetica").fontSize(11).fillColor("#0d1117").lineGap(4).text(optimizedResumeText, {
            align: "left",
            width: 512
        })

        doc.end()
    } catch (err) {
        console.error("PDF Generation error:", err)
        res.status(500).json({ message: err.message || "Server error generating PDF" })
    }
}

module.exports = { 
    genarateInterViewReportController, 
    getReportByIdController, 
    getAllReportsController, 
    generateResumePdfController 
}