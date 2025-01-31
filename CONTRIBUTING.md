# Contributing to SF Muni Train Tracker

Thank you for your interest in contributing to the SF Muni Train Tracker! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (see CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/sf-muni-tracker.git
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/sf-muni-tracker.git
   ```
4. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Environment Setup

1. Install Node.js (v14 or higher) and npm (v6 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Add your API keys to `.env` (see README.md for obtaining API keys)
5. Start the development server:
   ```bash
   npm start
   ```

## Coding Standards

### JavaScript

- Use ES6+ features
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions focused and concise
- Use async/await for asynchronous operations

### CSS

- Use descriptive class names
- Follow BEM naming convention
- Keep selectors specific but not overly complex
- Use CSS variables for colors and common values
- Maintain responsive design principles

### HTML

- Use semantic HTML elements
- Maintain accessibility standards
- Include ARIA labels where appropriate
- Keep markup clean and properly indented

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
    * 🎨 `:art:` when improving the format/structure of the code
    * 🐛 `:bug:` when fixing a bug
    * ✨ `:sparkles:` when adding a new feature
    * 📝 `:memo:` when writing docs
    * 🚀 `:rocket:` when improving performance
    * ✅ `:white_check_mark:` when adding tests
    * 🔒 `:lock:` when dealing with security

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md with a note describing your changes
3. The PR title should be clear and descriptive
4. Link any relevant issues in the PR description
5. Include screenshots for UI changes
6. Ensure all tests pass and add new tests if needed
7. Get at least one code review from a maintainer

### PR Checklist

Before submitting a PR, please check that you have:

- [ ] Updated documentation
- [ ] Added/updated tests if needed
- [ ] Tested the changes locally
- [ ] Verified that there are no console errors
- [ ] Checked for responsive design issues
- [ ] Updated CHANGELOG.md
- [ ] Added screenshots for UI changes

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test across different browsers
- Test responsive design on different screen sizes

## Reporting Bugs

1. Check if the bug has already been reported
2. Use the bug report template
3. Include:
   - Clear title and description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Browser/OS information

## Feature Requests

1. Check if the feature has already been requested
2. Use the feature request template
3. Provide clear use cases
4. Explain the expected behavior
5. Include mock-ups if applicable

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
