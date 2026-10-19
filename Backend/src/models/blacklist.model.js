const mongoose = require('mongoose')


const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [ true, "token is required to be added in blacklist" ],
        index: true    // every authenticated request looks a token up here
    }
}, {
    timestamps: true
})

// A JWT lives at most 1 day, so after 1 day a blacklisted token is expired anyway;
// MongoDB deletes the entry by itself (TTL index on createdAt from timestamps)
blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

const tokenBlacklistModel = mongoose.model("blacklistTokens", blacklistTokenSchema)


module.exports = tokenBlacklistModel