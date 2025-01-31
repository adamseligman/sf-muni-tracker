# SF Muni Train Tracker

A real-time tracking application for San Francisco's Muni Metro train lines (J, K, L, M, N, T), providing live tracking, arrival predictions, and weather information. This was a fun project built by AI agents.

## Features

- 🚊 Real-time train arrival predictions for inbound and outbound stops
- 🗺️ Interactive map showing live train positions
- 🌤️ Local weather information for the route area
- 🎯 Customizable stop selection
- 🚂 Multi-line support with toggleable train line visibility
- 📱 Responsive design for desktop and mobile devices

## Prerequisites

Before you begin, ensure you have:
- Node.js (v14 or higher)
- npm (v6 or higher)
- API keys for the following services:
  - [511.org API](https://511.org/developers/list/tokens/) - for transit data
  - [OpenWeather API](https://openweathermap.org/api) - for weather information
  - [Mapbox](https://www.mapbox.com/) - for interactive mapping

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sf-muni-tracker.git
   cd sf-muni-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to the `.env` file:
   ```
   TRANSIT_API_KEY=your_511_api_key_here
   WEATHER_API_KEY=your_openweather_api_key_here
   MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Documentation

### Endpoints

#### GET /api/predictions
Get real-time arrival predictions for specified stops.

Query Parameters:
- `inbound` (optional): Inbound stop ID (defaults to 17109)
- `outbound` (optional): Outbound stop ID (defaults to 16503)

Response:
```json
{
  "inbound": {
    "stopName": "Stop name",
    "ServiceDelivery": { ... }
  },
  "outbound": {
    "stopName": "Stop name",
    "ServiceDelivery": { ... }
  }
}
```

#### GET /api/weather
Get current weather and forecast for the route area.

Response:
```json
{
  "current": {
    "main": {
      "temp": number,
      "humidity": number
    },
    "weather": [{
      "description": string
    }]
  },
  "forecast": {
    "list": [...]
  }
}
```

#### GET /api/vehicles
Get real-time vehicle positions for all train lines.

Response:
```json
{
  "vehicles": [{
    "trainId": string,
    "routeId": string,
    "direction": number,
    "latitude": number,
    "longitude": number,
    "currentStatus": number,
    "readableStatus": string
  }]
}
```

### Notes on Modules Used

- **Axios:** Used for making HTTP requests to external APIs (e.g., fetching real-time transit data, weather information).

- **Helmet:** Sets various HTTP headers to improve security.  The `contentSecurityPolicy` middleware is configured to define a strict Content Security Policy (CSP) that restricts the sources of allowed content for the application, mitigating risks like XSS attacks.  It whitelists specific sources for scripts, styles, images, and connections, ensuring that only trusted resources are loaded.

- **Express-rate-limit:**  Implements rate limiting to prevent abuse and protect server resources. It's configured with a window of 15 minutes and a limit of 100 requests per IP address within that window.



### Project Structure

```
├── public/
│   ├── index.html      # Main HTML file
│   ├── script.js       # Frontend JavaScript
│   ├── styles.css      # CSS styles
│   └── train-routes.json # Train route data; can be updated with the fetch-routes-test.js script
├── server.js           # Express server
├── package.json        # Project dependencies
└── .env               # Environment variables (not in repo)
```

### Available Scripts

- `npm start`: Start the server
- `npm test`: Run tests (when implemented)

### Utility Scripts

#### fetch-routes-test.js
This utility script fetches all train stops from the 511.org API and writes them to `train-routes.json`. Since train stops don't change frequently, this helper function is used to generate a static route file that the application uses, reducing API calls and improving performance.

To update the train routes data:
```bash
node fetch-routes-test.js
```

The script:
- Fetches GTFS data for all Muni stops
- Retrieves route information for J, K, L, M, N, and T lines
- Combines stop and route data with location information
- Writes the compiled data to `public/train-routes.json`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- San Francisco Municipal Transportation Agency (SFMTA)
- 511.org for transit data
- OpenWeather for weather data
- Mapbox for mapping services
- The Cline agent was the primary developer of this project: https://github.com/cline/cline
