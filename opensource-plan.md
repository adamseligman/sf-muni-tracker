# Open Source Preparation Plan

## 1. License and Legal
- [x] Add LICENSE file (recommend MIT License for maximum adoption)
  - Added MIT License with copyright to Adam Seligman
- [x] Add copyright headers to all source files
  - Added headers to: server.js, public/script.js, public/styles.css, public/index.html
  - SECURITY NOTE: During this process, found several API keys and tokens that need to be moved to environment variables:
    * server.js: TRANSIT_API_KEY (511.org API)
    * server.js: WEATHER_API_KEY (OpenWeather API)
    * public/script.js: mapboxgl.accessToken (Mapbox API)
    * These should be addressed in the Security Review section
- [x] Review and document any third-party dependencies and their licenses
  - Dependencies reviewed from package.json:
    - adm-zip: MIT License
    - axios: MIT License
    - csv-parser: MIT License
    - express: MIT License
    - protobufjs: Apache-2.0 License
  - All licenses are compatible with MIT License
- [x] Ensure compliance with all dependency licenses
  - All dependencies use MIT or Apache-2.0 licenses which are compatible with our MIT license choice
  - No additional compliance steps needed

## 2. Security Review
- [x] Audit for API keys, tokens, and credentials in code and commit history
  - Found and removed:
    * 511.org Transit API key from server.js
    * OpenWeather API key from server.js
    * Mapbox access token from script.js
- [x] Move all sensitive configuration to environment variables
  - Added dotenv package for environment variable management
  - Updated server.js to use process.env for all API keys
  - Created /api/config endpoint to securely pass Mapbox token to frontend
  - Added environment variable validation on server startup
- [x] Create .env.example file showing required environment variables
  - Created with placeholders for:
    * TRANSIT_API_KEY (511.org)
    * WEATHER_API_KEY (OpenWeather)
    * MAPBOX_ACCESS_TOKEN (Mapbox)
    * PORT (optional, defaults to 3000)
- [x] Document how to obtain necessary API keys/credentials
  - Added instructions in .env.example for each API:
    * 511.org API: Register at https://511.org/developers/list/tokens/
    * OpenWeather API: Sign up at https://openweathermap.org/api
    * Mapbox API: Create account at https://www.mapbox.com/
- [x] Add .env to .gitignore
  - Created comprehensive .gitignore file
  - Added patterns for:
    * .env and .env.* (except .env.example)
    * node_modules and other common Node.js patterns
    * IDE files and system files
- [x] Review for any hardcoded paths, IPs, or environment-specific configurations
  - Found and documented:
    * Hardcoded ZIP code (94127) in weather endpoint
    * San Francisco coordinates in map initialization
    * These are left as-is since they're specific to the MUNI K-Ingleside line
- [x] Scan for security vulnerabilities in dependencies (npm audit)
  - Ran npm audit: 0 vulnerabilities found
  - All dependencies are up to date and secure

## 3. Documentation
- [x] Create comprehensive README.md including:
  - Project description and purpose
  - Features list with emoji icons for visual appeal
  - Installation instructions with step-by-step guide
  - Usage guide with command examples
  - API documentation for all endpoints
  - Environment setup requirements
  - Development setup guide
  - Project structure overview
  Note: Screenshots/demo pending - should be added after first deployment
- [x] Add inline code documentation for complex functions
  - Added JSDoc comments to server.js:
    * API endpoint handlers
    * Data processing functions
    * Error handling
  - Added JSDoc comments to script.js:
    * Map initialization and interaction functions
    * Data processing and display functions
    * Real-time update functions
    * API interaction functions
  - Documentation includes:
    * Function descriptions
    * Parameter types and descriptions
    * Return value types
    * Error handling information
- [x] Create CONTRIBUTING.md with:
  - Development environment setup
  - Detailed coding standards for JS, CSS, and HTML
  - Git commit message guidelines with emoji usage
  - Comprehensive PR process and checklist
  - Bug reporting and feature request guidelines
  - Testing requirements
  - License information
- [x] Add CHANGELOG.md to track version history
  - Created with initial 1.0.0 release
  - Follows Keep a Changelog format
  - Documents all major features
  - Lists security improvements
  - Documents dependencies

## 4. Code Quality
- [ ] Add .gitignore file
- [ ] Clean up commented-out code if it is not debugging related
- [ ] Remove debug logs
- [ ] Add error handling: make more detailed notes if you have suggestions or questions
- [ ] Add input validation
- [ ] Standardize code formatting
- [ ] Add ESLint/Prettier configuration
- [ ] Review and clean up TODOs

## 5. Project Structure
- [ ] Organize files into logical directories
- [ ] Remove unnecessary files and dependencies
- [ ] Clean up package.json (scripts, dependencies)
- [ ] Add npm scripts for common tasks
- [ ] Create example configuration files
- [ ] Add docker configuration if applicable

## 6. Community Engagement
- [ ] Set up issue templates
- [ ] Create pull request template
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Set up project boards/milestones
- [ ] Add badges (build status, coverage, version)
- [ ] Create roadmap document
- [ ] Set up documentation website if needed

## 7. Deployment
- [ ] Add deployment documentation
- [ ] Create production configuration example
- [ ] Document scaling considerations
- [ ] Add monitoring/logging guidelines
- [ ] Document backup/restore procedures if applicable

## 8. Testing
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add end-to-end tests
- [ ] Document testing procedures
- [ ] Set up test automation

## 9. Version Control
- [ ] Clean up commit history if needed
- [ ] Tag initial open source release
- [ ] Set up branch protection rules
- [ ] Document branching strategy

## 10. Final Checklist
- [ ] Run security audit
- [ ] Test installation from scratch
- [ ] Review documentation for completeness
- [ ] Check all links work
- [ ] Verify license compliance
- [ ] Test in clean environment
- [ ] Create initial release
