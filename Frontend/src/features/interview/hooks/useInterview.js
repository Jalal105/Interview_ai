import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response?.interviewReport) {
                setReport(response.interviewReport)
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

    const getResumePdf = async (interviewReportId) => {
        if (!/^[0-9a-fA-F]{24}$/.test(interviewReportId)) {
            setError("Invalid report ID format")
            return
        }
        setLoading(true)
        let response = null
        try {
            response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
        }
        catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [interviewId])

    return { loading, report, reports, error, generateReport, getReportById, getReports, getResumePdf }

}
