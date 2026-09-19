const express = require("express");
const authMiddleware = require("../middleware/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middleware/file.middleware")

const interviewRouter = express.Router()

/**
 * @route POST /api/interview/
 * @desc Generate a new interview report
 * @access Private
 */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.genarateInterViewReportController)

/**
 * @route GET /api/interview/
 * @desc Get all interview reports of logged in user
 * @access Private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllReportsController)

/**
 * @route GET /api/interview/report/:id
 * @desc Get an interview report by ID
 * @access Private
 */
interviewRouter.get("/report/:id", authMiddleware.authUser, interviewController.getReportByIdController)

/**
 * @route GET /api/interview/resume/data/:id
 * @desc Get or generate structured resume data for interactive preview
 * @access Private
 */
interviewRouter.get("/resume/data/:id", authMiddleware.authUser, interviewController.getResumeDataController)

/**
 * @route PUT /api/interview/resume/data/:id
 * @desc Update tailored resume data
 * @access Private
 */
interviewRouter.put("/resume/data/:id", authMiddleware.authUser, interviewController.updateResumeDataController)

/**
 * @route POST /api/interview/resume/pdf/:id
 * @desc Generate and download an executive ATS-compliant resume PDF
 * @access Private
 */
interviewRouter.post("/resume/pdf/:id", authMiddleware.authUser, interviewController.generateResumePdfController)

module.exports = interviewRouter