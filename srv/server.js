const cds = require('@sap/cds')
const cors = require('cors')

cds.on('bootstrap', app => {
  app.use(cors({
    origin: ['http://localhost:3000', 'https://charm-ai-production.up.railway.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
})

module.exports = cds.server