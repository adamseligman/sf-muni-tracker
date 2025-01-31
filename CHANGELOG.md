# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-30
### Added
- Initial open source release of SF Muni Train Tracker
- Real-time tracking for all SF Muni Metro lines (J, K, L, M, N, T)
- Interactive map showing live train positions
- Real-time arrival predictions for stops
- Weather information integration
- Customizable stop selection
- Responsive design for desktop and mobile
- Environment variable configuration
- API documentation
- Contribution guidelines

### Security
- Secure handling of API keys through environment variables
- Implementation of .gitignore for sensitive files
- Security audit of dependencies

### Dependencies
- Express.js for server
- Axios for HTTP requests
- Protobuf.js for GTFS realtime data
- Mapbox GL JS for mapping
- Weather Icons for weather display
- dotenv for environment variable management
