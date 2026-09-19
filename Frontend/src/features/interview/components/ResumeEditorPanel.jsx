import React, { useState } from 'react'

// ── Small reusable sub-components ────────────────────────────────────────────

/** Collapsible accordion section wrapper */
const AccordionSection = ({ id, title, icon, isOpen, onToggle, children, accent }) => (
    <div className={`editor-section ${isOpen ? 'editor-section--open' : ''}`}>
        <button
            className="editor-section__header"
            onClick={() => onToggle(id)}
            style={isOpen ? { borderLeftColor: accent, color: '#e6edf3' } : {}}
        >
            <span className="editor-section__icon">{icon}</span>
            <span className="editor-section__title">{title}</span>
            <span className={`editor-section__chevron ${isOpen ? 'open' : ''}`}>›</span>
        </button>
        {isOpen && <div className="editor-section__body">{children}</div>}
    </div>
)

/** Label + input pair */
const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="editor-field">
        <label className="editor-field__label">{label}</label>
        <input
            className="editor-field__input"
            type={type}
            value={value || ''}
            placeholder={placeholder || label}
            onChange={e => onChange(e.target.value)}
        />
    </div>
)

/** Label + textarea pair */
const TextareaField = ({ label, value, onChange, placeholder, rows = 4 }) => (
    <div className="editor-field">
        <label className="editor-field__label">{label}</label>
        <textarea
            className="editor-field__textarea"
            value={value || ''}
            placeholder={placeholder || label}
            rows={rows}
            onChange={e => onChange(e.target.value)}
        />
    </div>
)

/** Inline chip tag list with add-on-Enter and remove-on-× */
const TagInput = ({ label, tags = [], onChange }) => {
    const [draft, setDraft] = useState('')

    const addTag = () => {
        const trimmed = draft.trim()
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed])
        }
        setDraft('')
    }

    const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx))

    return (
        <div className="editor-field">
            {label && <label className="editor-field__label">{label}</label>}
            <div className="tag-input-box">
                {tags.map((t, i) => (
                    <span key={i} className="tag-chip">
                        {t}
                        <button className="tag-chip__remove" onClick={() => removeTag(i)} title="Remove">×</button>
                    </span>
                ))}
                <input
                    className="tag-input-box__input"
                    value={draft}
                    placeholder="Add, press Enter"
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    onBlur={addTag}
                />
            </div>
        </div>
    )
}

/** Bullet list with add / remove / edit */
const BulletList = ({ label, items = [], onChange, placeholder }) => {
    const update = (idx, val) => {
        const next = [...items]; next[idx] = val; onChange(next)
    }
    const remove = (idx) => onChange(items.filter((_, i) => i !== idx))
    const add    = () => onChange([...items, ''])

    return (
        <div className="editor-field">
            {label && <label className="editor-field__label">{label}</label>}
            <div className="bullet-list">
                {items.map((item, idx) => (
                    <div key={idx} className="bullet-row">
                        <span className="bullet-row__dot">•</span>
                        <input
                            className="editor-field__input bullet-row__input"
                            value={item}
                            placeholder={placeholder || 'Bullet point…'}
                            onChange={e => update(idx, e.target.value)}
                        />
                        <button className="bullet-row__remove" onClick={() => remove(idx)} title="Remove">×</button>
                    </div>
                ))}
            </div>
            <button className="add-item-btn" onClick={add}>＋ Add bullet</button>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * ResumeEditorPanel
 *
 * Left-panel form editor. Calls `onChange(newData)` on every mutation so the
 * parent can update localData and the preview re-renders live.
 *
 * @param {Object}   props.data       — current resume data object
 * @param {Function} props.onChange   — called with the full updated data object
 * @param {string}   props.accent     — theme accent color (for active section highlight)
 */
const ResumeEditorPanel = ({ data = {}, onChange, accent = '#ff2d78' }) => {
    const [openSection, setOpenSection] = useState('personal')

    const toggleSection = (id) =>
        setOpenSection(prev => (prev === id ? null : id))

    // ── Shorthand updaters ──────────────────────────────────────────────────

    const setInfo = (field, val) =>
        onChange({ ...data, personalInfo: { ...(data.personalInfo || {}), [field]: val } })

    const setSummary = (val) =>
        onChange({ ...data, summary: val })

    // ── Skills helpers ──────────────────────────────────────────────────────
    const updateSkillCategory = (idx, field, val) => {
        const skills = [...(data.skills || [])]
        skills[idx] = { ...skills[idx], [field]: val }
        onChange({ ...data, skills })
    }
    const updateSkillItems = (idx, items) => {
        const skills = [...(data.skills || [])]
        skills[idx] = { ...skills[idx], items }
        onChange({ ...data, skills })
    }
    const addSkillGroup = () =>
        onChange({ ...data, skills: [...(data.skills || []), { category: '', items: [] }] })
    const removeSkillGroup = (idx) =>
        onChange({ ...data, skills: (data.skills || []).filter((_, i) => i !== idx) })

    // ── Experience helpers ──────────────────────────────────────────────────
    const updateExp = (idx, field, val) => {
        const experience = [...(data.experience || [])]
        experience[idx] = { ...experience[idx], [field]: val }
        onChange({ ...data, experience })
    }
    const addExp = () =>
        onChange({ ...data, experience: [...(data.experience || []), { role: '', company: '', location: '', startDate: '', endDate: '', highlights: [] }] })
    const removeExp = (idx) =>
        onChange({ ...data, experience: (data.experience || []).filter((_, i) => i !== idx) })

    // ── Projects helpers ────────────────────────────────────────────────────
    const updateProj = (idx, field, val) => {
        const projects = [...(data.projects || [])]
        projects[idx] = { ...projects[idx], [field]: val }
        onChange({ ...data, projects })
    }
    const addProj = () =>
        onChange({ ...data, projects: [...(data.projects || []), { title: '', technologies: [], description: [] }] })
    const removeProj = (idx) =>
        onChange({ ...data, projects: (data.projects || []).filter((_, i) => i !== idx) })

    // ── Education helpers ───────────────────────────────────────────────────
    const updateEdu = (idx, field, val) => {
        const education = [...(data.education || [])]
        education[idx] = { ...education[idx], [field]: val }
        onChange({ ...data, education })
    }
    const addEdu = () =>
        onChange({ ...data, education: [...(data.education || []), { degree: '', institution: '', location: '', graduationDate: '' }] })
    const removeEdu = (idx) =>
        onChange({ ...data, education: (data.education || []).filter((_, i) => i !== idx) })

    // ── Render ──────────────────────────────────────────────────────────────
    const info       = data.personalInfo || {}
    const skills     = data.skills       || []
    const experience = data.experience   || []
    const projects   = data.projects     || []
    const education  = data.education    || []

    return (
        <div className="editor-panel">
            <div className="editor-panel__header">
                <span className="editor-panel__title">✏️ Resume Editor</span>
                <span className="editor-panel__subtitle">Changes reflect live in the preview →</span>
            </div>

            <div className="editor-sections">

                {/* ── Personal Info ─────────────────────────────────── */}
                <AccordionSection
                    id="personal" title="Personal Info" icon="👤"
                    isOpen={openSection === 'personal'}
                    onToggle={toggleSection} accent={accent}
                >
                    <Field label="Full Name"  value={info.fullName}  onChange={v => setInfo('fullName', v)}  placeholder="Jane Smith" />
                    <Field label="Job Title"  value={info.title}     onChange={v => setInfo('title', v)}     placeholder="Senior Software Engineer" />
                    <Field label="Email"      value={info.email}     onChange={v => setInfo('email', v)}     placeholder="jane@example.com" type="email" />
                    <Field label="Phone"      value={info.phone}     onChange={v => setInfo('phone', v)}     placeholder="+1 (555) 000-0000" />
                    <Field label="Location"   value={info.location}  onChange={v => setInfo('location', v)}  placeholder="San Francisco, CA" />
                    <Field label="LinkedIn"   value={info.linkedin}  onChange={v => setInfo('linkedin', v)}  placeholder="linkedin.com/in/jane" />
                    <Field label="GitHub"     value={info.github}    onChange={v => setInfo('github', v)}    placeholder="github.com/jane" />
                </AccordionSection>

                {/* ── Summary ───────────────────────────────────────── */}
                <AccordionSection
                    id="summary" title="Professional Summary" icon="📋"
                    isOpen={openSection === 'summary'}
                    onToggle={toggleSection} accent={accent}
                >
                    <TextareaField
                        label="Summary"
                        value={data.summary}
                        onChange={setSummary}
                        placeholder="Write a compelling 3–4 sentence professional summary..."
                        rows={5}
                    />
                </AccordionSection>

                {/* ── Skills ────────────────────────────────────────── */}
                <AccordionSection
                    id="skills" title="Technical Skills" icon="⚡"
                    isOpen={openSection === 'skills'}
                    onToggle={toggleSection} accent={accent}
                >
                    {skills.map((grp, idx) => (
                        <div key={idx} className="editor-card">
                            <div className="editor-card__header">
                                <input
                                    className="editor-field__input editor-card__title-input"
                                    value={grp.category || ''}
                                    placeholder="Category (e.g. Languages)"
                                    onChange={e => updateSkillCategory(idx, 'category', e.target.value)}
                                />
                                <button className="card-remove-btn" onClick={() => removeSkillGroup(idx)} title="Remove category">×</button>
                            </div>
                            <TagInput
                                tags={grp.items || []}
                                onChange={items => updateSkillItems(idx, items)}
                            />
                        </div>
                    ))}
                    <button className="add-item-btn add-item-btn--block" onClick={addSkillGroup}>
                        ＋ Add skill category
                    </button>
                </AccordionSection>

                {/* ── Experience ────────────────────────────────────── */}
                <AccordionSection
                    id="experience" title="Experience" icon="💼"
                    isOpen={openSection === 'experience'}
                    onToggle={toggleSection} accent={accent}
                >
                    {experience.map((job, idx) => (
                        <div key={idx} className="editor-card">
                            <div className="editor-card__header">
                                <span className="editor-card__index">#{idx + 1}</span>
                                <button className="card-remove-btn" onClick={() => removeExp(idx)} title="Remove job">×</button>
                            </div>
                            <Field label="Job Title"  value={job.role}      onChange={v => updateExp(idx, 'role', v)}      placeholder="Software Engineer" />
                            <Field label="Company"    value={job.company}   onChange={v => updateExp(idx, 'company', v)}   placeholder="Acme Corp" />
                            <Field label="Location"   value={job.location}  onChange={v => updateExp(idx, 'location', v)}  placeholder="Remote / City, State" />
                            <div className="editor-field-row">
                                <Field label="Start Date" value={job.startDate} onChange={v => updateExp(idx, 'startDate', v)} placeholder="Jan 2022" />
                                <Field label="End Date"   value={job.endDate}   onChange={v => updateExp(idx, 'endDate', v)}   placeholder="Present" />
                            </div>
                            <BulletList
                                label="Achievements"
                                items={job.highlights || []}
                                onChange={v => updateExp(idx, 'highlights', v)}
                                placeholder="Engineered X which improved Y by Z%"
                            />
                        </div>
                    ))}
                    <button className="add-item-btn add-item-btn--block" onClick={addExp}>
                        ＋ Add experience
                    </button>
                </AccordionSection>

                {/* ── Projects ──────────────────────────────────────── */}
                <AccordionSection
                    id="projects" title="Projects" icon="🚀"
                    isOpen={openSection === 'projects'}
                    onToggle={toggleSection} accent={accent}
                >
                    {projects.map((proj, idx) => (
                        <div key={idx} className="editor-card">
                            <div className="editor-card__header">
                                <span className="editor-card__index">#{idx + 1}</span>
                                <button className="card-remove-btn" onClick={() => removeProj(idx)} title="Remove project">×</button>
                            </div>
                            <Field label="Project Name" value={proj.title} onChange={v => updateProj(idx, 'title', v)} placeholder="My Awesome Project" />
                            <TagInput
                                label="Technologies"
                                tags={proj.technologies || []}
                                onChange={v => updateProj(idx, 'technologies', v)}
                            />
                            <BulletList
                                label="Description"
                                items={proj.description || []}
                                onChange={v => updateProj(idx, 'description', v)}
                                placeholder="Built a feature that…"
                            />
                        </div>
                    ))}
                    <button className="add-item-btn add-item-btn--block" onClick={addProj}>
                        ＋ Add project
                    </button>
                </AccordionSection>

                {/* ── Education ─────────────────────────────────────── */}
                <AccordionSection
                    id="education" title="Education" icon="🎓"
                    isOpen={openSection === 'education'}
                    onToggle={toggleSection} accent={accent}
                >
                    {education.map((edu, idx) => (
                        <div key={idx} className="editor-card">
                            <div className="editor-card__header">
                                <span className="editor-card__index">#{idx + 1}</span>
                                <button className="card-remove-btn" onClick={() => removeEdu(idx)} title="Remove education">×</button>
                            </div>
                            <Field label="Degree"          value={edu.degree}         onChange={v => updateEdu(idx, 'degree', v)}         placeholder="B.Tech in Computer Science" />
                            <Field label="Institution"     value={edu.institution}    onChange={v => updateEdu(idx, 'institution', v)}    placeholder="MIT" />
                            <Field label="Location"        value={edu.location}       onChange={v => updateEdu(idx, 'location', v)}       placeholder="Cambridge, MA" />
                            <Field label="Graduation Date" value={edu.graduationDate} onChange={v => updateEdu(idx, 'graduationDate', v)} placeholder="May 2024" />
                        </div>
                    ))}
                    <button className="add-item-btn add-item-btn--block" onClick={addEdu}>
                        ＋ Add education
                    </button>
                </AccordionSection>

            </div>
        </div>
    )
}

export default ResumeEditorPanel
