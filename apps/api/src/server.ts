import 'dotenv/config'
import * as dns from "dns";
dns.setServers(["1.1.1.1","8.8.8.8"]);

import app from './app.js'
import connectDatabase from './config/database.js'

const PORT = process.env.PORT || 5000

async function startServer() {
  await connectDatabase()

  app.listen(PORT, () => {
    console.log(`ConsistencyOS API running on port ${PORT}`)
  })
}

startServer()