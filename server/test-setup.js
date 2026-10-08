import 'dotenv/config'

const testUrl = process.env.TEST_DATABASE_URL

if (!testUrl) {
  throw new Error('TEST_DATABASE_URL must be set to run the tests')
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must not be the development database')
}

process.env.DATABASE_URL = testUrl
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'