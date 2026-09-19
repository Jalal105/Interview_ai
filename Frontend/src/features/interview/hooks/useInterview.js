import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, getResumeData, updateResumeData } from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context
    const [downloadingPdf, setDownloadingPdf] = useState(false)
    const [resumeData, setResumeData] = useState(null)
    const [resumeLoading, setResumeLoading] = useState(false)

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response?.interviewReport) {
                setReport(response.interviewReport)
                if (response.interviewReport.structuredResume) {
                    setResumeData(response.interviewReport.structuredResume)
                }
            }
        } catch (err) {
            console.log(err)
            setError(err.response?.data?.message || "Failed to generate interview report")
            throw err
        } finally {
            setLoading(false)
        }

        return response ? response.interviewReport : null
    }

    const getReportById = async (interviewId) => {
        if (!/^[0-9a-fA-F]{24}$/.test(interviewId)) {
            setReport(null)
            setError("Invalid report ID format")
            return null
        }
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            if (response?.interviewReport) {
                setReport(response.interviewReport)
                if (response.interviewReport.structuredResume) {
                    setResumeData(response.interviewReport.structuredResume)
                }
            } else {
                setError("Interview report not found")
            }
        } catch (err) {
            console.log(err)
            setError(err.response?.data?.message || "Failed to load interview report")
        } finally {
            setLoading(false)
        }
        return response ? response.interviewReport : null
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            if (response?.interviewReports) {
                setReports(response.interviewReports)
            }
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response ? response.interviewReports : []
    }

    const fetchResumeData = async (interviewReportId) => {
        const targetId = interviewReportId || report?._id || interviewId
        if (!targetId) return null
        setResumeLoading(true)
        try {
            const res = await getResumeData({ interviewReportId: targetId })
            if (res && res.structuredResume) {
                setResumeData(res.structuredResume)
                return res.structuredResume
            }
        } catch (err) {
            console.error("Failed to fetch resume data:", err)
        } finally {
            setResumeLoading(false)
        }
        return null
    }

    const saveResumeData = async (interviewReportId, updatedData) => {
        const targetId = interviewReportId || report?._id || interviewId
        try {
            const res = await updateResumeData({ interviewReportId: targetId, structuredResume: updatedData })
            if (res && res.structuredResume) {
                setResumeData(res.structuredResume)
            }
            return res
        } catch (err) {
            console.error("Failed to save resume data:", err)
            throw err
        }
    }

    const getResumePdf = async (interviewReportId, themeColor) => {
        const targetId = interviewReportId || report?._id || interviewId
        if (!/^[0-9a-fA-F]{24}$/.test(targetId)) {
            setError("Invalid report ID format")
            return
        }
        setDownloadingPdf(true)
        try {
            const response = await generateResumePdf({ interviewReportId: targetId, themeColor })
            const blob = new Blob([response], { type: "application/pdf" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${targetId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        }
        catch (error) {
            console.error("Download resume error:", error)
            let errorMsg = "Failed to generate resume PDF. Please try again."
            if (error.response?.data) {
                if (error.response.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text()
                        const parsed = JSON.parse(text)
                        if (parsed.message) errorMsg = parsed.message
                    } catch {
                        // ignore JSON parse error
                    }
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message
                }
            }
            alert(errorMsg)
        } finally {
            setDownloadingPdf(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [interviewId])

    return {
        loading,
        downloadingPdf,
        resumeData,
        setResumeData,
        resumeLoading,
        fetchResumeData,
        saveResumeData,
        report,
        reports,
        error,
        generateReport,
        getReportById,
        getReports,
        getResumePdf
    }

}
