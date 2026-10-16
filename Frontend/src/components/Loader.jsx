import React from 'react'

const Loader = ({ title = 'Loading', hint }) => (
    <div className='loader' role='status'>
        <span className='loader__spinner' aria-hidden='true' />
        <p className='loader__title'>{title}</p>
        {hint && <p className='loader__hint'>{hint}</p>}
    </div>
)

export default Loader
