import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import Loader from '../../../components/Loader'
import { scoreBand } from '../score.js'

const MAX_JOB_DESCRIPTION = 5000

const Home = () => {

    const { loading, generateReport, reports } = useInterview()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ error, setError ] = useState("")
    const [ resumeFile, setResumeFile ] = useState(null)
    const [ dragging, setDragging ] = useState(false)
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const removeResume = (e) => {
        // The button sits inside the upload box; stop it from also opening the file picker
        e.preventDefault()
        e.stopPropagation()
        setResumeFile(null)
        resumeInputRef.current.value = "" // so picking the same file again still counts as a change
    }

    // Used by both the file picker and drag & drop
    const pickResume = (file) => {
        if (!file) return
        if (file.type !== "application/pdf") {
            setError("Please choose a PDF file.")
            return
        }
        if (file.size > 3 * 1024 * 1024) {
            setError("That PDF is larger than 3MB.")
            return
        }
        setError("")
        setResumeFile(file)
    }

    const handleGenerateReport = async () => {
        setError("")
        // Same checks the server makes, so the answer is instant
        if (!jobDescription.trim()) {
            setError("Paste the job description first.")
            return
        }
        if (!resumeFile && !selfDescription.trim()) {
            setError("Add your resume, or describe yourself in a few lines.")
            return
        }
        try {
            const data = await generateReport({ jobDescription, selfDescription, resumeFile })
            navigate(`/interview/${data._id}`)
        } catch (err) {
            setError(err.message)
        }
    }

    if (loading) {
        return (
            <>
                <SiteNav />
                <Loader
                    title='Preparing your interview plan'
                    hint='Reading the job description and your profile. This takes about 30 seconds.' />
            </>
        )
    }

    return (
        <>
            <SiteNav />
            <main>

                {/* Hero */}
                <section className='hero'>
                    <p className='eyebrow'>Interview prep</p>
                    <h1 className='hero__title'>Know what they’ll ask.</h1>
                    <p className='hero__lead'>
                        Paste a job description and add your resume. You’ll get the questions you’re likely
                        to face, how to answer them, and a plan for the days before.
                    </p>
                </section>

                {/* The two steps */}
                <section className='builder'>
                    <div className='builder__grid'>

                        <div className='step-card'>
                            <p className='step-card__step'>Step 1</p>
                            <h2 className='step-card__title'>The role</h2>
                            <p className='step-card__hint'>Paste the full job description.</p>
                            <textarea
                                className='input step-card__textarea'
                                aria-label='Job description'
                                value={jobDescription}
                                onChange={(e) => { setJobDescription(e.target.value) }}
                                placeholder='Responsibilities, requirements, nice-to-haves…'
                                maxLength={MAX_JOB_DESCRIPTION}
                            />
                            <p className='step-card__counter'>
                                {jobDescription.length.toLocaleString()} / {MAX_JOB_DESCRIPTION.toLocaleString()}
                            </p>
                        </div>

                        <div className='step-card'>
                            <p className='step-card__step'>Step 2</p>
                            <h2 className='step-card__title'>You</h2>
                            <p className='step-card__hint'>Add your resume for the best results, or describe yourself in a few lines.</p>

                            <label
                                className={`dropzone ${resumeFile ? 'dropzone--ready' : ''} ${dragging ? 'dropzone--dragging' : ''}`}
                                htmlFor='resume'
                                // Without preventDefault the browser opens the dropped PDF instead
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => { setDragging(false) }}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); pickResume(e.dataTransfer.files[ 0 ]) }}>
                                {resumeFile ? (
                                    <>
                                        <span className='dropzone__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="8 12.5 11 15.5 16 9.5" /></svg>
                                        </span>
                                        <p className='dropzone__title' role='status'>Resume added</p>
                                        <p className='dropzone__file'>{resumeFile.name} · {Math.ceil(resumeFile.size / 1024)} KB</p>
                                        <p className='dropzone__subtitle'>
                                            Click to replace · <button type='button' className='text-link' onClick={removeResume}>Remove</button>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <span className='dropzone__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /><line x1="12" y1="17" x2="12" y2="11" /><polyline points="9.5 13.5 12 11 14.5 13.5" /></svg>
                                        </span>
                                        <p className='dropzone__title'>{dragging ? 'Drop your PDF here' : 'Choose a PDF, or drag it here'}</p>
                                        <p className='dropzone__subtitle'>Up to 3 MB</p>
                                    </>
                                )}
                                <input
                                    ref={resumeInputRef}
                                    hidden
                                    type='file'
                                    id='resume'
                                    name='resume'
                                    accept='.pdf'
                                    onChange={(e) => { pickResume(e.target.files[ 0 ]) }}
                                />
                            </label>

                            <div className='or-divider'><span>or</span></div>

                            <textarea
                                className='input step-card__textarea step-card__textarea--short'
                                aria-label='About you'
                                value={selfDescription}
                                onChange={(e) => { setSelfDescription(e.target.value) }}
                                placeholder='e.g. Final-year CS student. Built a React and Node.js app. Strong in data structures.'
                            />
                        </div>
                    </div>

                    <div className='builder__actions'>
                        {error && <p className='form-error' role='alert'>{error}</p>}
                        <button onClick={handleGenerateReport} className='button primary-button button--large'>
                            Create interview plan
                        </button>
                        <p className='builder__note'>Takes about 30 seconds.</p>
                    </div>
                </section>

                {/* Past plans */}
                {reports.length > 0 && (
                    <section className='plans'>
                        <h2 className='section-title'>Your plans.</h2>
                        <ul className='plans__grid'>
                            {reports.map(report => (
                                <li key={report._id}>
                                    <button className='plan-card' onClick={() => navigate(`/interview/${report._id}`)}>
                                        <span className={`plan-card__score score--${scoreBand(report.matchScore)}`}>{report.matchScore}</span>
                                        <span className='plan-card__score-label'>match</span>
                                        <span className='plan-card__title'>{report.title || 'Untitled role'}</span>
                                        <span className='plan-card__date'>
                                            {new Date(report.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className='plan-card__open'>Open plan ›</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
            <SiteFooter />
        </>
    )
}

export default Home
