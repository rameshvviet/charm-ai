const cds = require('@sap/cds')
const cors = require('cors')

cds.on('bootstrap', app => {
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
  }))
})

module.exports = cds.server