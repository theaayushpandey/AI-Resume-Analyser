import React from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/hooks/useAuth'

// Thin translucent bar at the top of every page
const SiteNav = () => {
    const { user, handleLogout } = useAuth()
    const navigate = useNavigate()

    const signOut = async () => {
        await handleLogout()
        navigate('/login')
    }

    return (
        <header className='site-nav'>
            <div className='site-nav__inner'>
                <Link to='/' className='site-nav__brand'>Resume Analyzer</Link>
                {user && (
                    <nav className='site-nav__links'>
                        <Link to='/' className='site-nav__link'>New plan</Link>
                        <span className='site-nav__user'>{user.username}</span>
                        <button className='text-link' onClick={signOut}>Sign out</button>
                    </nav>
                )}
            </div>
        </header>
    )
}

export default SiteNav
