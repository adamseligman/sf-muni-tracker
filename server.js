/**
 * Copyright (c) 2024 Adam Seligman
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['TRANSIT_API_KEY', 'WEATHER_API_KEY', 'MAPBOX_ACCESS_TOKEN'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: ${envVar} environment variable is required`);
        process.exit(1);
    }
}

const app = express();

// Security middleware
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.mapbox.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "*.mapbox.com", "'unsafe-hashes'"],
    imgSrc: ["'self'", "data:", "blob:", "*.mapbox.com", "*.openweathermap.org"],
    connectSrc: ["'self'", "*.mapbox.com", "https://events.mapbox.com", "api.511.org", "api.openweathermap.org"],
    workerSrc: ["blob:"],
    childSrc: ["blob:"]
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// HTTPS enforcement
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
const port = process.env.PORT || 3000;

const TRANSIT_API_URL = 'https://api.511.org/transit/StopMonitoring';
const VEHICLE_POSITIONS_URL = 'https://api.511.org/transit/vehiclepositions';
const protobuf = require('protobufjs');

// Default stop information
const STOPS = {
    '17109': 'Inbound to Downtown',
    '16503': 'Outbound to Ocean Beach'
};

/**
 * Makes API calls to 511.org to get real-time predictions for a specific stop
 * @param {string} stopId - The ID of the stop to get predictions for
 * @returns {Promise<Object>} The prediction data from 511.org
 * @throws {Error} If the API call fails or returns invalid data
 */
async function getStopPredictions(stopId) {
    try {
        const url = new URL(TRANSIT_API_URL);
        const params = {
            api_key: process.env.TRANSIT_API_KEY,
            agency: 'SF',  // SF for San Francisco Muni
            stopCode: stopId,
            format: 'json'
        };
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        // console.log('Making 511.org API call to:', url.toString());
        
        const response = await axios.get(url.toString());
        // console.log('Response for stop', stopId + ':', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error(`Error calling 511.org API for stop ${stopId}:`, error.response?.data || error.message);
        throw error;
    }
}

// Serve static files from public directory
app.use(express.static('public'));

// Endpoint to get environment variables needed by frontend
app.get('/api/config', (req, res) => {
    res.json({
        mapboxToken: process.env.MAPBOX_ACCESS_TOKEN
    });
});


/**
 * GET /api/predictions
 * Returns real-time arrival predictions for specified inbound and outbound stops
 * @route GET /api/predictions
 * @param {string} [req.query.inbound=15779] - Inbound stop ID
 * @param {string} [req.query.outbound=15780] - Outbound stop ID
 * @returns {Object} Prediction data for both stops
 * @throws {Error} If transit API key is missing or API calls fail
 */
app.get('/api/predictions', async (req, res) => {
    // Get stop IDs from query parameters, fallback to defaults
    const inboundStopId = req.query.inbound || '17109';
    const outboundStopId = req.query.outbound || '16503';
    try {
        if (!process.env.TRANSIT_API_KEY) {
            throw new Error('Transit API key not configured. Please set up your 511.org API key.');
        }

        // console.log('Fetching predictions...');
        const [inbound, outbound] = await Promise.all([
            getStopPredictions(inboundStopId),
            getStopPredictions(outboundStopId)
        ]);

        // Create the response
        const response = {
            inbound: { 
                stopName: STOPS[inboundStopId] || `Stop #${inboundStopId}`,
                ServiceDelivery: inbound.ServiceDelivery
            },
            outbound: {
                stopName: STOPS[outboundStopId] || `Stop #${outboundStopId}`,
                ServiceDelivery: outbound.ServiceDelivery
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

/**
 * GET /api/weather
 * Returns current weather and forecast for the K-Ingleside line area
 * @route GET /api/weather
 * @returns {Object} Current weather and forecast data
 * @throws {Error} If weather API calls fail
 */
app.get('/api/weather', async (req, res) => {
    try {
        const ZIP_CODE = '94127';
        
        // Get current weather
        const currentResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?zip=${ZIP_CODE},us&appid=${process.env.WEATHER_API_KEY}&units=imperial`
        );

        // Get forecast
        const forecastResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?zip=${ZIP_CODE},us&appid=${process.env.WEATHER_API_KEY}&units=imperial`
        );

        const response = {
            current: currentResponse.data,
            forecast: forecastResponse.data
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching weather:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Load GTFS-realtime proto
let FeedMessage;
(async () => {
    try {
        const root = await protobuf.load("gtfs-realtime2.proto");
        FeedMessage = root.lookupType("transit_realtime.FeedMessage");
        //console.log('Successfully loaded GTFS-realtime protobuf schema');
    } catch (err) {
        console.error('Failed to load protobuf:', err);
    }
})();

/**
 * GET /api/vehicles
 * Returns real-time positions of all SF Muni Metro trains (J, K, L, M, N, T lines)
 * @route GET /api/vehicles
 * @returns {Object} Vehicle position data with human-readable status
 * @throws {Error} If protobuf schema is not loaded or API call fails
 */
app.get('/api/vehicles', async (req, res) => {
    try {
        //console.log('Fetching vehicle positions for all train lines...');
        if (!FeedMessage) {
            throw new Error('Protobuf schema not loaded');
        }

        const response = await axios.get(VEHICLE_POSITIONS_URL, {
            params: {
                api_key: process.env.TRANSIT_API_KEY,
                agency: 'SF'
            },
            responseType: 'arraybuffer'
        });

        //console.log('Received response from VEHICLE_POSITIONS_URL');
        
        const buffer = Buffer.from(response.data);
        //console.log('Buffer length:', buffer.length);

        // Parse the protobuf data
        const feed = FeedMessage.decode(buffer);
        //console.log('Decoded feed:', JSON.stringify(feed, null, 2));

        // Filter for SF MTA trains (J, K, L, M, N, T)
        const sfMtaTrains = feed.entity.filter(entity => {
            return entity.vehicle && entity.vehicle.trip && ['J', 'K', 'L', 'M', 'N', 'T'].includes(entity.vehicle.trip.routeId);
        });

        //console.log('Filtered SF Muni trains:', JSON.stringify(sfMtaTrains, null, 2));

        // Prettify the output
        const prettifiedOutput = sfMtaTrains.map(entity => {
            const vehicle = entity.vehicle;
            //console.log('Raw vehicle data:', JSON.stringify(vehicle, null, 2));
            //console.log('Raw timestamp:', vehicle.timestamp);
            return {
                trainId: `${vehicle.trip.routeId}${vehicle.vehicle?.id}`, // Include route ID in trainId
                routeId: vehicle.trip.routeId,
                direction: vehicle.trip?.directionId,
                stopId: vehicle.stopId,
                currentStopSequence: vehicle.currentStopSequence,
                currentStatus: vehicle.currentStatus,
                latitude: vehicle.position?.latitude,
                longitude: vehicle.position?.longitude,
                speed: vehicle.position?.speed,
                timestamp: vehicle.timestamp,
                rawTimestamp: vehicle.timestamp
            };
        });

        //console.log('Prettified output:', JSON.stringify(prettifiedOutput, null, 2));

        // Function to get stop name from stop ID
        function getStopName(stopId) {
            return STOPS[stopId] || 'Unknown Stop';
        }

        // Add human-readable status and location
        prettifiedOutput.forEach(vehicle => {
            let status;
            switch (vehicle.currentStatus) {
                case 0:
                    status = 'Incoming';
                    break;
                case 1:
                    status = 'Stopped';
                    break;
                case 2:
                    status = 'In Transit';
                    break;
                default:
                    status = 'Unknown';
            }

            vehicle.readableStatus = `${status} at ${getStopName(vehicle.stopId)}`;
        });

        //console.log('Final output:', JSON.stringify(prettifiedOutput, null, 2));

        // Return the prettified data wrapped in a 'vehicles' property
        res.json({ vehicles: prettifiedOutput });
    } catch (error) {
        console.error('Error in /api/vehicles endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle positions: ' + error.message });
    }
});

/**
 * GET /api/lines
 * Returns information about all SF Muni Metro lines
 * @route GET /api/lines
 * @returns {Object} Transit line data from 511.org
 * @throws {Error} If API call fails
 */
app.get('/api/lines', async (req, res) => {
    try {
        const response = await axios.get('http://api.511.org/transit/lines', {
            params: {
                api_key: process.env.TRANSIT_API_KEY,
                operator_id: 'SFMTA',
                format: 'json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching lines:', error);
        res.status(500).json({ error: 'Failed to fetch transit lines' });
    }
});

/**
 * GET /api/patterns/:lineId
 * Returns route pattern data for a specific transit line
 * @route GET /api/patterns/:lineId
 * @param {string} req.params.lineId - The ID of the transit line
 * @returns {Object} Route pattern data from 511.org
 * @throws {Error} If API call fails
 */
app.get('/api/patterns/:lineId', async (req, res) => {
    try {
        const { lineId } = req.params;
        const response = await axios.get('http://api.511.org/transit/patterns', {
            params: {
                api_key: process.env.TRANSIT_API_KEY,
                operator_id: 'SFMTA',
                line_id: lineId,
                format: 'json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching patterns:', error);
        res.status(500).json({ error: 'Failed to fetch route patterns' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
