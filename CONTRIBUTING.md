# Contributing to YuuLogger

First off, thank you for considering contributing to YuuLogger! It's people like you that make YuuLogger such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please take a moment to read it before contributing. We strive to create a respectful and inclusive environment for everyone. Please report unacceptable behavior to [Yuzu_0204@outlook.comm](mailto:Yuzu_0204@outlook.com).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for YuuLogger. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report:**

* Check the [issues](https://github.com/Yuzu02/Yuulogger/issues) to see if the problem has already been reported.
* Determine which repository the problem should be reported in.
* Perform a cursory search to see if the problem has already been reported.

**How Do I Submit A (Good) Bug Report?**

Bugs are tracked as GitHub issues. Create an issue and provide the following information:

* Use a clear and descriptive title for the issue to identify the problem.
* Describe the exact steps which reproduce the problem in as many details as possible.
* Provide specific examples to demonstrate the steps.
* Describe the behavior you observed after following the steps and point out what exactly is the problem with that behavior.
* Explain which behavior you expected to see instead and why.
* Include screenshots or animated GIFs if possible.
* If the problem is related to performance or memory, include a CPU profile capture if possible.
* Specify your NestJS version, Node.js version, and npm/yarn version.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for YuuLogger, including completely new features and minor improvements to existing functionality.

**Before Submitting An Enhancement Suggestion:**

* Check if there's already a package which provides that enhancement.
* Determine which repository the enhancement should be suggested in.
* Perform a cursory search to see if the enhancement has already been suggested.

**How Do I Submit A (Good) Enhancement Suggestion?**

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

* Use a clear and descriptive title for the issue to identify the suggestion.
* Provide a step-by-step description of the suggested enhancement in as many details as possible.
* Provide specific examples to demonstrate the steps or point out the part of YuuLogger where the enhancement should be applied.
* Describe the current behavior and explain which behavior you expected to see instead and why.
* Explain why this enhancement would be useful to most YuuLogger users.
* Specify which version of YuuLogger you're using.
* Specify the name and version of the OS you're using.

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the JavaScript/TypeScript styleguides
* Include unit tests for any new code
* Document new code
* End all files with a newline

## Development Setup

Here's how to set up YuuLogger for local development:

1. Fork the YuuLogger repository on GitHub.
2. Clone your fork locally:

   ```bash
   git clone https://github.com/Yuzu02/Yuulogger.git
   cd yuulogger
   ```

3. Install dependencies and setup the development environment:

   ```bash
   npm install
   ```

   or if you use yarn:

   ```bash
   yarn install
   ```

4. Create a branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Make your changes and commit them with a meaningful commit message.
6. Push your changes to your fork on GitHub:

   ```bash
   git push origin feature/your-feature-name
   ```

7. Submit a pull request to the main repository.

## Coding Guidelines

### TypeScript Style Guide

* Use TypeScript for all new code
* Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
* Use camelCase for variables and functions
* Use PascalCase for classes and interfaces
* Use kebab-case for file names
* Prefer interfaces over type aliases
* Use meaningful variable and function names
* Add proper JSDoc comments for public APIs

### Testing Guidelines

* Write unit tests for all new code
* Ensure all tests pass before submitting a pull request
* Aim for at least 80% code coverage
* Use Jest for testing
* Use Test Driven Development (TDD) when possible

## Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
  * 🎨 `:art:` when improving the format/structure of the code
  * 🐎 `:racehorse:` when improving performance
  * 🚱 `:non-potable_water:` when plugging memory leaks
  * 📝 `:memo:` when writing docs
  * 🐛 `:bug:` when fixing a bug
  * 🔥 `:fire:` when removing code or files
  * 💚 `:green_heart:` when fixing the CI build
  * ✅ `:white_check_mark:` when adding tests
  * 🔒 `:lock:` when dealing with security
  * ⬆️ `:arrow_up:` when upgrading dependencies
  * ⬇️ `:arrow_down:` when downgrading dependencies

## Releases

We follow [Semantic Versioning](https://semver.org/) for YuuLogger releases:

* MAJOR version for incompatible API changes (X.y.z)
* MINOR version for backwards-compatible functionality additions (x.Y.z)
* PATCH version for backwards-compatible bug fixes (x.y.Z)

## License

By contributing to YuuLogger, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
