import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import SiteNav from '../../../components/SiteNav'

const Login = () => {

    const { handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")
    const [ submitting, setSubmitting ] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)
        try {
            await handleLogin({ email, password })
            navigate('/')
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <SiteNav />
            <main className='auth-page'>
                <div className='auth-card'>
                    <h1>Sign in</h1>
                    <p className='auth-card__lead'>Pick up where you left off.</p>

                    <form className='auth-form' onSubmit={handleSubmit}>
                        <div className='field'>
                            <label htmlFor='email'>Email</label>
                            <input
                                className='input'
                                onChange={(e) => { setEmail(e.target.value) }}
                                type='email' id='email' name='email' autoComplete='email' required />
                        </div>
                        <div className='field'>
                            <label htmlFor='password'>Password</label>
                            <input
                                className='input'
                                onChange={(e) => { setPassword(e.target.value) }}
                                type='password' id='password' name='password' autoComplete='current-password' required />
                        </div>

                        {error && <p className='form-error' role='alert'>{error}</p>}

                        <button className='button primary-button full-width' disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <p className='auth-card__switch'>New here? <Link to='/register'>Create an account ›</Link></p>
                </div>
            </main>
        </>
    )
}

export default Login
