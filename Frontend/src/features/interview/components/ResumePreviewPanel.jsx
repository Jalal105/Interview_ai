import React from 'react'

/**
 * ResumePreviewPanel
 * Pure read-only A4 paper preview. Receives `data` and `themeColor` as props.
 * Updates live whenever the editor sidebar mutates `localData` in the parent.
 */
const ResumePreviewPanel = ({ data = {}, themeColor = '#ff2d78' }) => {
    const info       = data.personalInfo || {}
    const summary    = data.summary      || ''
    const skills     = data.skills       || []
    const experience = data.experience   || []
    const projects   = data.projects     || []
    const education  = data.education    || []

    return (
        <div className="resume-paper-wrapper">
            <article className="resume-paper-sheet" id="printable-resume">

                {/* ── Header ───────────────────────────────────────── */}
                <header className="resume-header">
                    <h1 className="candidate-name">
                        {info.fullName || 'Candidate Name'}
                    </h1>

                    <p className="target-title" style={{ color: themeColor }}>
                        {info.title || 'Target Role'}
                    </p>

                    <div className="contact-bar">
                        {info.email && <span>{info.email}</span>}
                        {info.phone && (
                            <><span className="contact-sep">•</span><span>{info.phone}</span></>
                        )}
                        {info.location && (
                            <><span className="contact-sep">•</span><span>{info.location}</span></>
                        )}
                        {info.linkedin && (
                            <>
                                <span className="contact-sep">•</span>
                                <a
                                    href={info.linkedin.startsWith('http') ? info.linkedin : `https://${info.linkedin}`}
                                    target="_blank" rel="noreferrer"
                                >
                                    LinkedIn
                                </a>
                            </>
                        )}
                        {info.github && (
                            <>
                                <span className="contact-sep">•</span>
                                <a
                                    href={info.github.startsWith('http') ? info.github : `https://${info.github}`}
                                    target="_blank" rel="noreferrer"
                                >
                                    GitHub
                                </a>
                            </>
                        )}
                    </div>

                    <div className="header-divider" style={{ backgroundColor: themeColor }} />
                </header>

                {/* ── Summary ──────────────────────────────────────── */}
                {summary && (
                    <section className="resume-section">
                        <h2 className="section-header" style={{ borderBottomColor: themeColor }}>
                            Professional Summary
                        </h2>
                        <p className="summary-text">{summary}</p>
                    </section>
                )}

                {/* ── Skills ───────────────────────────────────────── */}
                {skills.length > 0 && (
                    <section className="resume-section">
                        <h2 className="section-header" style={{ borderBottomColor: themeColor }}>
                            Technical Skills &amp; Competencies
                        </h2>
                        <div className="skills-grid">
                            {skills.map((grp, idx) => {
                                if (typeof grp === 'string') {
                                    return (
                                        <div key={idx} className="skill-row">
                                            <span className="skill-items">• {grp}</span>
                                        </div>
                                    )
                                }
                                const items = Array.isArray(grp.items)
                                    ? grp.items.join(', ')
                                    : (typeof grp.items === 'string' ? grp.items : '')
                                return (
                                    <div key={idx} className="skill-row">
                                        <span className="skill-cat-title">{grp.category || 'Skills'}: </span>
                                        <span className="skill-items">{items}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* ── Experience ───────────────────────────────────── */}
                {experience.length > 0 && (
                    <section className="resume-section">
                        <h2 className="section-header" style={{ borderBottomColor: themeColor }}>
                            Professional Experience
                        </h2>
                        <div className="experience-list">
                            {experience.map((job, idx) => {
                                const highlights = Array.isArray(job.highlights)
                                    ? job.highlights
                                    : (Array.isArray(job.description) ? job.description : (typeof job.highlights === 'string' ? [job.highlights] : []))
                                return (
                                    <div key={idx} className="exp-item">
                                        <div className="exp-header">
                                            <span className="exp-role">{job.role}</span>
                                            <span className="exp-dates">
                                                {[job.startDate, job.endDate].filter(Boolean).join(' – ')}
                                            </span>
                                        </div>
                                        <div className="exp-sub" style={{ color: themeColor }}>
                                            {[job.company, job.location].filter(Boolean).join('  •  ')}
                                        </div>
                                        <ul className="exp-bullets">
                                            {highlights.map((h, hIdx) => (
                                                <li key={hIdx}>{String(h || '').replace(/^[\s•*\-]+/, '')}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* ── Projects ─────────────────────────────────────── */}
                {projects.length > 0 && (
                    <section className="resume-section">
                        <h2 className="section-header" style={{ borderBottomColor: themeColor }}>
                            Featured Projects
                        </h2>
                        <div className="projects-list">
                            {projects.map((proj, idx) => {
                                const techList = Array.isArray(proj.technologies)
                                    ? proj.technologies.filter(Boolean)
                                    : (typeof proj.technologies === 'string' && proj.technologies.trim()
                                        ? proj.technologies.split(',').map(t => t.trim()).filter(Boolean)
                                        : [])
                                const descList = Array.isArray(proj.description)
                                    ? proj.description
                                    : (typeof proj.description === 'string' ? [proj.description] : [])
                                return (
                                    <div key={idx} className="project-item">
                                        <div className="project-header">
                                            <span className="project-title">
                                                {proj.title}
                                                {techList.length > 0 && (
                                                    <span style={{
                                                        fontSize: '0.82rem',
                                                        fontWeight: '500',
                                                        color: themeColor,
                                                        marginLeft: '8px'
                                                    }}>
                                                        [{techList.join(', ')}]
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <ul className="project-bullets">
                                            {descList.map((d, dIdx) => (
                                                <li key={dIdx}>{String(d || '').replace(/^[\s•*\-]+/, '')}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* ── Education ────────────────────────────────────── */}
                {education.length > 0 && (
                    <section className="resume-section">
                        <h2 className="section-header" style={{ borderBottomColor: themeColor }}>
                            Education
                        </h2>
                        <div className="education-list">
                            {education.map((edu, idx) => (
                                <div key={idx} className="edu-item">
                                    <div className="edu-header">
                                        <span className="edu-degree">{edu.degree}</span>
                                        {edu.graduationDate && (
                                            <span className="edu-date">{edu.graduationDate}</span>
                                        )}
                                    </div>
                                    <div className="edu-sub" style={{ color: '#475569' }}>
                                        {[edu.institution, edu.location].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </article>
        </div>
    )
}

export default ResumePreviewPanel
