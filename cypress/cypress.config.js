{
  "baseUrl": "http://localhost:5173",
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "video": false,
  "screenshotOnRunFailure": true,
  "e2e": {
    "specPattern": "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    "supportFile": "cypress/support/e2e.ts",
    "setupNodeEvents": "cypress/plugins/index.ts"
  },
  "env": {
    "apiUrl": "http://localhost:3001",
    "email": "test@example.com",
    "password": "TestPassword123!"
  },
  "retries": {
    "runMode": 2,
    "openMode": 0
  }
}
