import React, { useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useParams, useNavigate } from 'react-router'

const NAV_ITEMS = [
    {
        id: 'technical',
        label: 'Technical Questions',
        dataKey: 'technicalQuestions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'behavioral',
        label: 'Behavioral Questions',
        dataKey: 'behavioralQuestions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        id: 'preparation',
        label: 'Preparation Plan',
        dataKey: 'preparationPlan',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        )
    }
]

// ── Sub-components ──
const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)
    return (
        <li className='content-item q-card' onClick={() => setOpen(!open)}>
            <div className='q-card__header'>
                <span className='content-item__number'>{index + 1}</span>
                <span className='content-item__text q-card__question'>{item.question}</span>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body' onClick={(e) => e.stopPropagation()}>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </li>
    )
}

const RoadMapDay = ({ day, index }) => (
    <li className='content-item roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='content-item__number'>{index + 1}</span>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i} className='roadmap-day__task'>
                    <span className='roadmap-day__bullet' />
                    <span className='roadmap-day__task-text'>{task}</span>
                </li>
            ))}
        </ul>
    </li>
)

// ── Main Component ──
const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const { report, loading, error, getResumePdf } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan…</h1>
            </main>
        )
    }

    if (error || !report) {
        return (
            <main className='loading-screen error-screen'>
                <h1 style={{ color: '#ff2d78' }}>Error</h1>
                <p style={{ color: '#7d8590', marginTop: '10px' }}>{error || "Interview report not found"}</p>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: '1px solid #ff2d78',
                            color: '#ff2d78',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#ff2d78'
                            e.target.style.color = '#fff'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'transparent'
                            e.target.style.color = '#ff2d78'
                        }}
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        style={{
                            padding: '10px 20px',
                            background: '#ff2d78',
                            border: '1px solid #ff2d78',
                            color: '#fff',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'transparent'
                            e.target.style.color = '#ff2d78'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = '#ff2d78'
                            e.target.style.color = '#fff'
                        }}
                    >
                        Back to Home
                    </button>
                </div>
            </main>
        )
    }

    const currentSection = NAV_ITEMS.find(n => n.id === activeNav)
    const currentItems = report[currentSection.dataKey] || []

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left Sidebar — Navigation ── */}
                <nav className='interview-nav'>
                    <div className="nav-top">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                                <span className='interview-nav__badge'>
                                    {(report[item.dataKey] || []).length}
                                </span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => getResumePdf(report._id || interviewId)}
                        className='download-resume-btn'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Resume
                    </button>
                </nav>

                <div className='interview-divider' />

                {/* ── Center — Main Content ── */}
                <main className='interview-content'>
                    <div className='content-header'>
                        <h2>{currentSection.label}</h2>
                        <span className='content-header__count'>
                            {currentItems.length} items
                        </span>
                    </div>

                    <ul className='content-list' key={activeNav}>
                        {activeNav === 'preparation' ? (
                            currentItems.map((day, idx) => (
                                <RoadMapDay key={idx} day={day} index={idx} />
                            ))
                        ) : (
                            currentItems.map((q, idx) => (
                                <QuestionCard key={idx} item={q} index={idx} />
                            ))
                        )}
                    </ul>
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar — Skill Gaps ── */}
                <aside className='interview-sidebar'>

                    {/* Match Score */}
                    <div className='sidebar-section'>
                        <p className='sidebar-section__label'>Match Score</p>
                        <div className='match-ring'>
                            <div className='match-ring__circle'>
                                <span className='match-ring__value'>{report.matchScore}</span>
                                <span className='match-ring__pct'>%</span>
                            </div>
                            <p className='match-ring__hint'>Profile–role alignment</p>
                        </div>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='sidebar-section'>
                        <p className='sidebar-section__label'>Skill Gaps</p>
                        <div className='skill-chips'>
                            {report.skillGaps.map((gap, idx) => (
                                <span key={idx} className={`skill-chip skill-chip--${gap.severity || 'medium'}`}>
                                    <span className='skill-chip__dot' />
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    )
}

export default Interview
