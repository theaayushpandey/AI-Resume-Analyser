import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import SiteNav from '../../../components/SiteNav'

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")
    const [ submitting, setSubmitting ] = useState(false)

    const { handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)
        try {
            await handleRegister({ username, email, password })
            navigate("/")
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
                    <h1>Create your account</h1>
                    <p className='auth-card__lead'>One account for all your interview plans.</p>

                    <form className='auth-form' onSubmit={handleSubmit}>
                        <div className='field'>
                            <label htmlFor='username'>Username</label>
                            <input
                                className='input'
                                onChange={(e) => { setUsername(e.target.value) }}
                                type='text' id='username' name='username' autoComplete='username' required />
                        </div>
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
                                type='password' id='password' name='password' autoComplete='new-password' required />
                        </div>

                        {error && <p className='form-error' role='alert'>{error}</p>}

                        <button className='button primary-button full-width' disabled={submitting}>
                            {submitting ? 'Creating account…' : 'Continue'}
                        </button>
                    </form>

                    <p className='auth-card__switch'>Already have an account? <Link to='/login'>Sign in ›</Link></p>
                </div>
            </main>
        </>
    )
}

export default Register
