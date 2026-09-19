import React, { useState, useEffect } from 'react'
import '../style/tailoredResume.scss'
import ResumeEditorPanel  from './ResumeEditorPanel'
import ResumePreviewPanel from './ResumePreviewPanel'

const THEME_PALETTES = [
    { name: 'Neon Pink',       color: '#ff2d78' },
    { name: 'Royal Blue',      color: '#2563eb' },
    { name: 'Emerald',         color: '#059669' },
    { name: 'Violet',          color: '#7c3aed' },
    { name: 'Executive Slate', color: '#1e293b' },
]

export const TailoredResumeView = ({
    report,
    resumeData,
    resumeLoading,
    fetchResumeData,
    saveResumeData,
    downloadingPdf,
    getResumePdf,
}) => {
    const [themeColor,  setThemeColor]  = useState(resumeData?.themeColor || '#ff2d78')
    const [editMode,    setEditMode]    = useState(false)
    const [localData,   setLocalData]   = useState(null)
    const [saving,      setSaving]      = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        if (!resumeData && report?._id) fetchResumeData(report._id)
    }, [resumeData, report?._id])

    useEffect(() => {
        if (resumeData) {
            setLocalData(resumeData)
            if (resumeData.themeColor) setThemeColor(resumeData.themeColor)
        }
    }, [resumeData])

    const handleColorChange = (color) => {
        setThemeColor(color)
        if (localData) setLocalData({ ...localData, themeColor: color })
    }

    const handleDataChange = (newData) => setLocalData(newData)

    const handleSave = async () => {
        if (!localData || !report?._id) return
        setSaving(true)
        try {
            await saveResumeData(report._id, { ...localData, themeColor })
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch {
            alert('Failed to save changes. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    if (resumeLoading && !localData) {
        return (
            <div className="tailored-resume-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div style={{
                    display: 'inline-block', width: '36px', height: '36px',
                    border: '3px solid rgba(255,45,120,0.2)', borderTopColor: '#ff2d78',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem'
                }} />
                <h3 style={{ color: '#e6edf3', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    Crafting Your Tailored ATS Resume...
                </h3>
                <p style={{ color: '#7d8590', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto' }}>
                    Gemini is optimizing your experience bullets, tailoring keywords, and structuring an executive format.
                </p>
            </div>
        )
    }

    const displayData = localData || resumeData || {}

    return (
        <div className="tailored-resume-container">

            <div className="resume-control-bar">
                <div className="control-group">
                    <span className="control-label">Theme:</span>
                    <div className="color-palette">
                        {THEME_PALETTES.map(p => (
                            <button
                                key={p.color}
                                className={`color-dot ${themeColor === p.color ? 'active' : ''}`}
                                style={{ backgroundColor: p.color }}
                                title={p.name}
                                onClick={() => handleColorChange(p.color)}
                            />
                        ))}
                    </div>
                </div>

                {report?.matchScore != null && (
                    <div className="ats-score-pill">
                        <span className="ats-score-pill__label">ATS Match</span>
                        <span className="ats-score-pill__value" style={{ background: themeColor }}>
                            {report.matchScore}%
                        </span>
                        <span className="ats-score-pill__role">{report.title}</span>
                    </div>
                )}

                <div className="action-buttons">
                    <button
                        className={`resume-btn resume-btn--secondary ${editMode ? 'active' : ''}`}
                        onClick={() => setEditMode(m => !m)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        {editMode ? 'Close Editor' : 'Edit Resume'}
                    </button>

                    {editMode && (
                        <button className="resume-btn resume-btn--save" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}

                    <button className="resume-btn resume-btn--secondary" onClick={() => window.print()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Print
                    </button>

                    <button
                        className="resume-btn resume-btn--primary"
                        onClick={() => getResumePdf(report._id, themeColor)}
                        disabled={downloadingPdf}
                    >
                        {downloadingPdf ? (
                            <>
                                <span style={{
                                    display: 'inline-block', width: '12px', height: '12px',
                                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                                }} />
                                Building PDF...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download ATS PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {saveSuccess && (
                <div style={{
                    background: 'rgba(5,150,105,0.15)', border: '1px solid #059669',
                    color: '#34d399', padding: '0.6rem 1rem', borderRadius: '8px',
                    fontSize: '0.85rem', textAlign: 'center'
                }}>
                    Resume saved successfully!
                </div>
            )}

            {!editMode && (
                <div className="ats-scorecard">
                    <div className="score-badge">
                        <span className="score-circle">
                            {report?.matchScore != null ? `${report.matchScore}%` : 'ATS'}
                        </span>
                        <span className="score-text">
                            Role Alignment: {report?.title || 'Target Role'}
                        </span>
                    </div>
                    <div className="ats-checklist">
                        <span className="check-item">Single-Column Standard</span>
                        <span className="check-item">Action Verbs and Metrics</span>
                        <span className="check-item">ATS Keyword Tagging</span>
                        <span className="check-item">Clean Contact Hierarchy</span>
                    </div>
                </div>
            )}

            <div className={`resume-builder-layout ${editMode ? 'resume-builder-layout--editing' : ''}`}>
                {editMode && (
                    <ResumeEditorPanel
                        data={displayData}
                        onChange={handleDataChange}
                        accent={themeColor}
                    />
                )}
                <ResumePreviewPanel
                    data={displayData}
                    themeColor={themeColor}
                />
            </div>

        </div>
    )
}

export default TailoredResumeView