// Vercel function: every request is rewritten here (vercel.json) and served by the compiled Nest app.
module.exports = require('../dist/serverless').default;
