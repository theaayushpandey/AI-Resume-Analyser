import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { Link, useParams } from 'react-router'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import Loader from '../../../components/Loader'
import { scoreBand, SCORE_LABEL } from '../score.js'

const SEVERITY_LABEL = { high: 'High priority', medium: 'Medium', low: 'Low' }

// ── Sub-components ────────────────────────────────────────────────────────────

// Thin circular progress ring that fills up when the page opens
const ScoreRing = ({ score }) => {
    const radius = 72
    const circumference = 2 * Math.PI * radius
    const [ shown, setShown ] = useState(0)

    useEffect(() => {
        const timer = setTimeout(() => setShown(score), 80)
        return () => clearTimeout(timer)
    }, [ score ])

    const band = scoreBand(score)
    return (
        <div className={`score-ring score--${band}`}>
            <svg width='168' height='168' viewBox='0 0 168 168' aria-hidden='true'>
                <circle className='score-ring__track' cx='84' cy='84' r={radius} />
                <circle
                    className='score-ring__progress'
                    cx='84' cy='84' r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - shown / 100)}
                />
            </svg>
            <div className='score-ring__center'>
                <span className='score-ring__value'>{score}</span>
                <span className='score-ring__unit'>% match</span>
            </div>
            <p className='score-ring__label'>{SCORE_LABEL[ band ]}</p>
        </div>
    )
}

const QuestionCard = ({ item, index }) => {
    const [ open, setOpen ] = useState(false)
    return (
        <li className={`qa ${open ? 'qa--open' : ''}`}>
            <button className='qa__head' aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <span className='qa__num'>{index + 1}</span>
                <span className='qa__question'>{item.question}</span>
                <span className='qa__chevron' aria-hidden='true'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </button>
            {open && (
                <div className='qa__body'>
                    <h3>Why they ask</h3>
                    <p>{item.intention}</p>
                    <h3>How to answer</h3>
                    <p>{item.answer}</p>
                </div>
            )}
        </li>
    )
}

const PlanTimeline = ({ plan }) => (
    <ol className='timeline'>
        {plan.map(day => (
            <li key={day.day} className='timeline__day'>
                <p className='timeline__label'>Day {day.day}</p>
                <div className='timeline__content'>
                    <h3 className='timeline__focus'>{day.focus}</h3>
                    <ul className='timeline__tasks'>
                        {day.tasks.map((task, i) => <li key={i}>{task}</li>)}
                    </ul>
                </div>
            </li>
        ))}
    </ol>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeTab, setActiveTab ] = useState('technical')
    const [ downloading, setDownloading ] = useState(false)
    const [ downloadError, setDownloadError ] = useState('')
    const { report, getReportById, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        }
    }, [ interviewId ])

    if (loading || !report) {
        return (
            <>
                <SiteNav />
                <Loader title='Loading your plan' />
            </>
        )
    }

    const handleDownload = async () => {
        setDownloadError('')
        setDownloading(true)
        try {
            await getResumePdf(interviewId)
        } catch (err) {
            setDownloadError(err.message)
        } finally {
            setDownloading(false)
        }
    }

    const tabs = [
        { id: 'technical', label: 'Technical', count: report.technicalQuestions.length },
        { id: 'behavioral', label: 'Behavioral', count: report.behavioralQuestions.length },
        { id: 'plan', label: 'Prep plan', count: report.preparationPlan.length },
    ]

    return (
        <>
            <SiteNav />
            <main>

                {/* ── Header: role, score, download ── */}
                <section className='report-hero'>
                    <div className='report-hero__inner'>
                        <div className='report-hero__text'>
                            <p className='eyebrow'>Interview plan</p>
                            <h1 className='report-hero__title'>{report.title || 'Untitled role'}</h1>
                            <p className='report-hero__meta'>
                                Created {new Date(report.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className='report-hero__actions'>
                                <button className='button primary-button' onClick={handleDownload} disabled={downloading}>
                                    {downloading ? 'Writing your resume…' : 'Download tailored resume'}
                                </button>
                                <Link to='/' className='chevron-link'>New plan ›</Link>
                            </div>
                            {downloading && <p className='report-hero__note'>This takes about 20 seconds.</p>}
                            {downloadError && <p className='form-error' role='alert'>{downloadError}</p>}
                        </div>
                        <ScoreRing score={report.matchScore} />
                    </div>

                    {report.skillGaps.length > 0 && (
                        <div className='gaps'>
                            <h2 className='gaps__title'>Skills to strengthen</h2>
                            <ul className='gaps__list'>
                                {report.skillGaps.map((gap, i) => (
                                    <li key={i} className='gap-chip'>
                                        <span className={`gap-chip__dot gap-chip__dot--${gap.severity}`} aria-hidden='true' />
                                        {gap.skill}
                                        <span className='gap-chip__level'>{SEVERITY_LABEL[ gap.severity ] || gap.severity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                {/* ── Questions and plan ── */}
                <section className='report-body'>
                    <div className='report-body__inner'>
                        <div className='segmented' role='tablist' aria-label='Report sections'>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    role='tab'
                                    aria-selected={activeTab === tab.id}
                                    className={`segmented__item ${activeTab === tab.id ? 'segmented__item--active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                    <span className='segmented__count'>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {activeTab !== 'plan' && (
                            <>
                                <p className='report-body__intro'>Open a question to see why they ask it and how to answer.</p>
                                <ul className='qa-list'>
                                    {(activeTab === 'technical' ? report.technicalQuestions : report.behavioralQuestions).map((q, i) => (
                                        <QuestionCard key={`${activeTab}-${i}`} item={q} index={i} />
                                    ))}
                                </ul>
                            </>
                        )}

                        {activeTab === 'plan' && (
                            <>
                                <p className='report-body__intro'>A {report.preparationPlan.length}-day plan for the days before your interview.</p>
                                <PlanTimeline plan={report.preparationPlan} />
                            </>
                        )}
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    )
}

export default Interview
