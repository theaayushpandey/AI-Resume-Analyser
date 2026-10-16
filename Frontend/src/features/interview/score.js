// Match score bands, used by the plan cards and the report page
export const scoreBand = (score) => (score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low')

export const SCORE_LABEL = {
    high: 'Strong match',
    mid: 'Good match',
    low: 'Needs work',
}
