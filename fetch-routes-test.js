/**
 * SF Muni Train Tracker - Route Data Fetcher
 * Copyright (c) 2024 Adam Seligman
 * MIT License - See LICENSE file for details
 * 
 * This utility script fetches train stop data from the 511.org API
 * and generates a static route file (train-routes.json) used by the application.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const AdmZip = require('adm-zip');

if (!process.env.TRANSIT_API_KEY) {
    throw new Error('TRANSIT_API_KEY environment variable is required');
}

// Configuration
const TRANSIT_API_KEY = process.env.TRANSIT_API_KEY;
const GTFS_API_ENDPOINT = 'http://api.511.org/transit/datafeeds';
const LINES_API_ENDPOINT = 'http://api.511.org/transit/lines';
const PATTERNS_API_ENDPOINT = 'http://api.511.org/transit/patterns';
const REQUIRED_LINES = new Set(['J', 'K', 'L', 'M', 'N', 'T']);

async function fetchGTFSData() {
    try {
        console.log('Fetching GTFS data from 511.org API...');
        
        const response = await axios.get(GTFS_API_ENDPOINT, {
            params: {
                api_key: TRANSIT_API_KEY,
                operator_id: 'SF',
            },
            responseType: 'arraybuffer'
        });

        const zip = new AdmZip(response.data);
        const stopsEntry = zip.getEntry('stops.txt');
        
        if (!stopsEntry) {
            throw new Error('stops.txt not found in GTFS data');
        }

        const stopsData = stopsEntry.getData().toString('utf8');
        const stops = await parseCSV(stopsData);

        console.log(`Parsed ${stops.length} stops from GTFS data`);
        return stops;
    } catch (error) {
        console.error('GTFS Fetch Error:', error.message);
        throw error;
    }
}

function parseCSV(data) {
    return new Promise((resolve, reject) => {
        const results = [];
        const parser = csv()
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
        
        parser.write(data);
        parser.end();
    });
}

async function fetchRoutes(stops) {
    try {
        // console.log('Fetching Muni route data from 511.org API...');
        
        const response = await axios.get(LINES_API_ENDPOINT, {
            params: {
                api_key: TRANSIT_API_KEY,
                operator_id: 'SF',
                format: 'json'
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        // console.log('\nAPI Response Status:', response.status);
        
        // Log raw response for debugging
        // console.log('Raw API response:', JSON.stringify(response.data, null, 2));
        
        if (!Array.isArray(response.data)) {
            throw new Error('Invalid API response structure - expected array of routes');
        }

        const routes = response.data;
        // console.log(`Found ${routes.length} total routes`);

        // Filter and validate required lines
        const trainRoutes = routes.filter(route => 
            REQUIRED_LINES.has(route.Id)
        );

        // console.log('\nRequired Train Lines Found:');
        // trainRoutes.forEach(route => {
        //     console.log(`- ${route.Id}: ${route.Name} (${route.TransportMode})`);
        // });

        // Verify we have all required lines
        const foundCodes = new Set(trainRoutes.map(r => r.Id));
        const missing = [...REQUIRED_LINES].filter(x => !foundCodes.has(x));
        
        if (missing.length > 0) {
            throw new Error(`Missing routes: ${missing.join(', ')}`);
        }

        // console.log('\nAll required train lines present!');
        return trainRoutes;

    } catch (error) {
        console.error('\nRoute Fetch Error:');
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
            console.error('Response Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        throw error;
    }
}

async function fetchPatterns(lineId) {
    try {
        console.log(`Fetching pattern data for line ${lineId} from 511.org API...`);
        
        const response = await axios.get(PATTERNS_API_ENDPOINT, {
            params: {
                api_key: TRANSIT_API_KEY,
                operator_id: 'SF',
                line_id: lineId,
                format: 'json'
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log(`API Response Status for line ${lineId}:`, response.status);
        
        if (!response.data || typeof response.data !== 'object') {
            throw new Error(`Invalid API response structure for line ${lineId}`);
        }

        // Extract journeyPatterns from the response
        const journeyPatterns = response.data.journeyPatterns || [];
        if (!Array.isArray(journeyPatterns)) {
            throw new Error(`Invalid patterns data for line ${lineId} - expected array of journeyPatterns`);
        }

        console.log(`Number of journey patterns for line ${lineId}:`, journeyPatterns.length);

        // Extract stops with name and location
        const stops = new Set();
        journeyPatterns.forEach(pattern => {
            if (pattern.PointsInSequence) {
                const stopPoints = pattern.PointsInSequence.StopPointInJourneyPattern || [];
                const timingPoints = pattern.PointsInSequence.TimingPointInJourneyPattern || [];
                [...stopPoints, ...timingPoints].forEach(point => {
                    if (point.ScheduledStopPointRef && point.Name) {
                        const stopInfo = {
                            id: point.ScheduledStopPointRef,
                            name: point.Name,
                        };
                        // Look for latitude and longitude in different possible locations
                        if (point.Location) {
                            stopInfo.lat = point.Location.Latitude;
                            stopInfo.long = point.Location.Longitude;
                        } else if (point.stop_lat && point.stop_lon) {
                            stopInfo.lat = point.stop_lat;
                            stopInfo.long = point.stop_lon;
                        } else if (point.Latitude && point.Longitude) {
                            stopInfo.lat = point.Latitude;
                            stopInfo.long = point.Longitude;
                        }
                        stops.add(JSON.stringify(stopInfo));
                    }
                });
            }
        });

        const stopsArray = Array.from(stops).map(JSON.parse);
        console.log(`Number of stops found for line ${lineId}:`, stopsArray.length);

        return {
            patterns: journeyPatterns,
            stops: stopsArray
        };
    } catch (error) {
        console.error(`\nPattern Fetch Error for line ${lineId}:`);
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
            console.error('Response Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        return null;
    }
}

// Execute the test
async function runTest() {
    try {
        const gtfsStops = await fetchGTFSData();
        const routes = await fetchRoutes();
        
        let totalStops = 0;
        const allStops = new Set();
        const summary = [];

        for (const route of routes) {
            const data = await fetchPatterns(route.Id);
            if (data) {
                route.Patterns = data.patterns;
                route.Stops = data.stops.map(stop => {
                    const gtfsStop = gtfsStops.find(s => s.stop_id === stop.id);
                    return {
                        ...stop,
                        lat: gtfsStop ? gtfsStop.stop_lat : stop.lat,
                        long: gtfsStop ? gtfsStop.stop_lon : stop.long
                    };
                });
                totalStops += route.Stops.length;
                route.Stops.forEach(stop => allStops.add(stop.id));
                
                summary.push({
                    line: route.Id,
                    name: route.Name,
                    stopCount: route.Stops.length,
                    stops: route.Stops
                });
            }
        }

        console.log('\nSummary:');
        summary.forEach(line => {
            console.log(`\nLine ${line.line} (${line.name}):`);
            console.log(`Total stops: ${line.stopCount}`);
            console.log('Stops:');
            line.stops.forEach(stop => {
                const location = stop.lat && stop.long ? `(${stop.lat}, ${stop.long})` : '(location not available)';
                console.log(`  - ${stop.name} ${location}`);
            });
        });

        console.log(`\nTotal number of stops (including duplicates): ${totalStops}`);
        console.log(`Total number of unique stops: ${allStops.size}`);

        // Check if any stops have lat/long information
        const stopsWithLocation = summary.flatMap(line => line.stops).filter(stop => stop.lat && stop.long);
        if (stopsWithLocation.length === 0) {
            console.log('\nNote: No latitude and longitude information is available for any stops.');
        } else {
            console.log(`\nNote: ${stopsWithLocation.length} out of ${totalStops} stops have latitude and longitude information.`);
        }

        // Write routes data to JSON file with timestamp
        const routesData = {
            timestamp: new Date().toISOString(),
            totalStops,
            uniqueStops: allStops.size,
            stopsWithLocation: stopsWithLocation.length,
            routes: summary
        };

        fs.writeFileSync('train-routes.json', JSON.stringify(routesData, null, 2));
        console.log('\nRoute data has been written to train-routes.json');

    } catch (error) {
        console.error('Test execution error:', error);
    }
}

runTest();
