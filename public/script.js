/**
 * Copyright (c) 2024 Adam Seligman
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Array of train lines
const trainLines = ['J', 'K', 'L', 'M', 'N', 'T'];

// Store all valid stops from train-routes.json
let allStops = new Map();
// Current stop being edited (inbound or outbound)
let currentStopType = null;
// Default stops
const defaultStops = {
    inbound: '15779',
    outbound: '15780'
};
// Current stops
let currentStops = { ...defaultStops };

/**
 * Loads all train stops from train-routes.json and stores them in allStops Map
 * @async
 * @throws {Error} If fetching or parsing train routes fails
 */
async function loadAllStops() {
    try {
        const response = await fetch('/train-routes.json');
        const data = await response.json();
        
        // Create a Map of all valid stops with their details
        data.routes.forEach(route => {
            route.stops.forEach(stop => {
                if (stop.id && stop.name) {
                    allStops.set(stop.id, {
                        name: stop.name,
                        line: route.line,
                        lat: stop.lat,
                        long: stop.long
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error loading stops:', error);
    }
}

/**
 * Validates a stop ID against the loaded stops
 * @param {string} stopId - The ID to validate
 * @returns {Object} Validation result with isValid boolean and stop details
 */
function validateStop(stopId) {
    const stop = allStops.get(stopId);
    return {
        isValid: !!stop,
        details: stop
    };
}

// Modal elements
const modal = document.getElementById('stop-modal');
const closeBtn = document.querySelector('.close');
const validateBtn = document.getElementById('validate-stop');
const saveBtn = document.getElementById('save-stop');
const stopInput = document.getElementById('stop-id');
const validationMsg = document.getElementById('stop-validation');

// Click handlers for stop info
document.getElementById('inbound-stop').addEventListener('click', () => openStopModal('inbound'));
document.getElementById('outbound-stop').addEventListener('click', () => openStopModal('outbound'));

/**
 * Opens the stop selection modal for a specific direction
 * @param {('inbound'|'outbound')} type - The direction type
 */
function openStopModal(type) {
    currentStopType = type;
    modal.style.display = 'block';
    stopInput.value = currentStops[type];
    saveBtn.disabled = true;
    validationMsg.className = 'validation-message';
    validationMsg.textContent = '';
}

function closeModal() {
    modal.style.display = 'none';
    stopInput.value = '';
    currentStopType = null;
}

// Close modal when clicking X or outside
closeBtn.onclick = closeModal;
window.onclick = (event) => {
    if (event.target === modal) {
        closeModal();
    }
};

// Validate button click handler
validateBtn.addEventListener('click', () => {
    const stopId = stopInput.value.trim();
    const validation = validateStop(stopId);
    
    if (validation.isValid) {
        validationMsg.className = 'validation-message success';
        validationMsg.textContent = `Valid stop: ${validation.details.name} (${validation.details.line} Line)`;
        saveBtn.disabled = false;
    } else {
        validationMsg.className = 'validation-message error';
        validationMsg.textContent = 'Invalid stop ID. Please enter a valid stop ID.';
        saveBtn.disabled = true;
    }
});

// Save button click handler
saveBtn.addEventListener('click', () => {
    const stopId = stopInput.value.trim();
    const validation = validateStop(stopId);
    
    if (validation.isValid) {
        const stopDetails = allStops.get(stopId);
        currentStops[currentStopType] = stopId;
        document.getElementById(`${currentStopType}-stop`).textContent = `Stop #${stopId}`;
        document.getElementById(`${currentStopType}-location`).textContent = stopDetails.name;
        closeModal();
        fetchPredictions(); // Refresh predictions with new stop
    }
});

// Object to store the selected state of each train line
let selectedTrainLines = {};

/**
 * Gets the color for a train line from CSS variables
 * @param {string} line - The train line identifier (J, K, L, M, N, T)
 * @returns {string} The CSS color value for the line
 */
function getRouteColor(line) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--route-${line.toLowerCase()}`).trim();
}

/**
 * Formats minutes into a human-readable string
 * @param {number} minutes - Number of minutes
 * @returns {string} Formatted string (e.g., "5 mins" or "Arriving")
 */
function formatMinutes(minutes) {
    if (minutes === 0) return 'Arriving';
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
}

/**
 * Generates and adds train line toggle buttons to the UI
 * Initializes selectedTrainLines state
 */
function generateTrainLineButtons() {
    const container = document.getElementById('train-line-buttons');
    trainLines.forEach(line => {
        const button = document.createElement('button');
        button.className = 'train-line-button selected ' + line.toLowerCase();
        button.textContent = line;
        button.addEventListener('click', () => toggleTrainLine(line));
        container.appendChild(button);
        selectedTrainLines[line] = true;
    });
}

/**
 * Toggles visibility of a train line on the map
 * Updates UI and refreshes map markers
 * @param {string} line - The train line to toggle
 */
function toggleTrainLine(line) {
    selectedTrainLines[line] = !selectedTrainLines[line];
    const button = document.querySelector(`.train-line-button.${line.toLowerCase()}`);
    if (selectedTrainLines[line]) {
        button.classList.add('selected');
        button.classList.remove('deselected');
    } else {
        button.classList.add('deselected');
        button.classList.remove('selected');
    }
    fetchVehiclePositions();
    fetchAndPlotStops();
}

/**
 * Updates the last updated time display
 */
function updateTimeDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('update-time').textContent = timeString;
}

/**
 * Creates a DOM element for a prediction
 * @param {Object} prediction - The prediction data
 * @param {number} prediction.minutes - Minutes until arrival
 * @param {string} prediction.destination - Destination name
 * @param {boolean} prediction.atStop - Whether train is at stop
 * @returns {HTMLElement} The prediction element
 */
function createPredictionElement(prediction) {
    const predictionItem = document.createElement('div');
    predictionItem.className = 'prediction-item';
    
    const status = prediction.atStop ? 'At Stop' : formatMinutes(prediction.minutes);
    const destination = prediction.destination.replace(' Station', '').replace('Metro ', '');
    
    predictionItem.innerHTML = `
        <div class="prediction-info">
            <div class="destination">${destination}</div>
            <div class="time">
                <span class="minutes ${prediction.atStop ? 'at-stop' : ''}">${status}</span>
            </div>
        </div>
    `;
    return predictionItem;
}

/**
 * Extracts and processes arrival predictions from 511.org stop monitoring data
 * @param {Object} stopData - Raw stop monitoring data from 511.org API
 * @returns {Array<Object>} Array of processed predictions, sorted by arrival time
 * @property {number} minutes - Minutes until arrival
 * @property {string} destination - Destination display name
 * @property {boolean} atStop - Whether vehicle is currently at the stop
 */
function extractPredictions(stopData) {
    try {
        if (!stopData?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit) {
            return [];
        }

        const visits = stopData.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;
        
        return visits
            .map(visit => {
                try {
                    const journey = visit.MonitoredVehicleJourney;
                    if (!journey?.MonitoredCall?.ExpectedArrivalTime) {
                        return null;
                    }

                    const arrivalTime = new Date(journey.MonitoredCall.ExpectedArrivalTime);
                    const now = new Date();
                    const minutesAway = Math.round((arrivalTime - now) / 60000);

                    if (minutesAway < 0) return null;

                    return {
                        minutes: minutesAway,
                        destination: journey.MonitoredCall.DestinationDisplay || journey.DestinationName,
                        atStop: journey.MonitoredCall.VehicleAtStop === 'true'
                    };
                } catch (error) {
                    console.error('Error processing visit:', error);
                    return null;
                }
            })
            .filter(prediction => prediction !== null)
            .sort((a, b) => a.minutes - b.minutes);
    } catch (error) {
        console.error('Error processing predictions:', error);
        return [];
    }
}

/**
 * Updates the predictions display for a specific stop
 * @param {Object} data - Stop data including predictions
 * @param {string} elementId - ID of the container element
 */
function updatePredictionsDisplay(data, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    const stopNameHeader = document.createElement('h2');
    stopNameHeader.className = 'stop-name';
    stopNameHeader.textContent = data.stopName;
    container.appendChild(stopNameHeader);

    const predictions = extractPredictions(data);
    if (!predictions || !predictions.length) {
        container.appendChild(document.createElement('div')).className = 'loading';
        container.lastChild.textContent = 'No predictions available';
        return;
    }

    predictions.forEach(prediction => {
        container.appendChild(createPredictionElement(prediction));
    });
}

/**
 * Processes API response data and updates the UI
 * @param {Object} data - Response data containing inbound and outbound predictions
 */
function processApiResponse(data) {
    if (data.inbound) {
        updatePredictionsDisplay(data.inbound, 'inbound-predictions');
    }
    if (data.outbound) {
        updatePredictionsDisplay(data.outbound, 'outbound-predictions');
    }
    updateTimeDisplay();
}

/**
 * Fetches predictions from the API and updates the UI
 * @async
 * @throws {Error} If the API request fails
 */
async function fetchPredictions() {
    try {
        const response = await fetch(`/api/predictions?inbound=${currentStops.inbound}&outbound=${currentStops.outbound}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        processApiResponse(data);
    } catch (error) {
        console.error('Error fetching predictions:', error);
        document.getElementById('inbound-predictions').innerHTML = 
            '<div class="loading">Error loading predictions</div>';
        document.getElementById('outbound-predictions').innerHTML = 
            '<div class="loading">Error loading predictions</div>';
    }
}

/**
 * Fetches weather data from the API and updates the UI
 * @async
 * @throws {Error} If the API request fails
 */
async function fetchWeather() {
    try {
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateWeatherDisplay(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('current-temp').textContent = 'Error';
        document.getElementById('current-conditions').textContent = 'Error loading weather';
        document.getElementById('forecast').textContent = 'Error loading forecast';
    }
}

/**
 * Updates the weather display with current conditions and forecast
 * @param {Object} data - Weather data from OpenWeather API
 */
function updateWeatherDisplay(data) {
    const currentTemp = Math.round(data.current.main.temp);
    const currentConditions = data.current.weather[0].description;
    const iconCode = data.current.weather[0].icon;
    
    document.getElementById('current-temp').textContent = `${currentTemp}°F`;
    document.getElementById('current-conditions').textContent = currentConditions;
    
    const iconElement = document.getElementById('weather-icon');
    iconElement.className = `wi ${getWeatherIconClass(iconCode)}`;
    
    const nextThreeHours = data.forecast.list.slice(0, 3);
    const forecastText = nextThreeHours
        .map(f => {
            const time = new Date(f.dt * 1000).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            return `${time}: ${Math.round(f.main.temp)}°F, ${f.weather[0].description}`;
        })
        .join(' | ');
    
    document.getElementById('forecast').textContent = forecastText;
}

/**
 * Maps OpenWeather icon codes to Weather Icons classes
 * @param {string} iconCode - OpenWeather icon code
 * @returns {string} Weather Icons class name
 */
function getWeatherIconClass(iconCode) {
    const iconMap = {
        '01d': 'wi-day-sunny',
        '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy',
        '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud',
        '03n': 'wi-cloud',
        '04d': 'wi-cloudy',
        '04n': 'wi-cloudy',
        '09d': 'wi-showers',
        '09n': 'wi-showers',
        '10d': 'wi-day-rain',
        '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm',
        '11n': 'wi-thunderstorm',
        '13d': 'wi-snow',
        '13n': 'wi-snow',
        '50d': 'wi-fog',
        '50n': 'wi-fog'
    };
    return iconMap[iconCode] || 'wi-na';
}

/**
 * Formats a timestamp into a human-readable string
 * Handles both regular timestamps and protobuf Long objects
 * @param {(number|Object)} timestamp - Unix timestamp or protobuf Long object
 * @returns {string} Formatted time string
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    if (timestamp.low !== undefined && timestamp.high !== undefined) {
        const milliseconds = timestamp.low * 1000 + timestamp.high * 4294967296000;
        timestamp = milliseconds;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        console.log('Invalid date');
        return 'Invalid Date';
    }
    return date.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric',
        second: 'numeric',
        hour12: true 
    });
}

// Mapbox initialization
let map;
let mapLoaded = false;

/**
 * Initializes the Mapbox map and sets up event handlers
 * Fetches Mapbox token from server and configures the map with SF-specific settings
 * @async
 * @throws {Error} If configuration fetch fails or map initialization fails
 */
async function initializeMap() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch configuration');
        const config = await response.json();
        
        mapboxgl.accessToken = config.mapboxToken;
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v10',
            center: [-122.4194, 37.7749], // San Francisco coordinates
            zoom: 12
        });

        map.on('load', () => {
            mapLoaded = true;
            fetchVehiclePositions();
            fetchAndDrawRoutes();
            fetchAndPlotStops();
        });
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

/**
 * Handles map resize events
 */
function resizeMap() {
    if (map) {
        map.resize();
    }
}

// Initialize map on page load
initializeMap();

// Add event listener for window resize
window.addEventListener('resize', resizeMap);

let markers = [];

/**
 * Fetches current vehicle positions from the API
 * @async
 * @throws {Error} If the API request fails
 */
async function fetchVehiclePositions() {
    try {
        const response = await fetch('/api/vehicles');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.vehicles) {
            throw new Error('Invalid data structure received from server');
        }
        if (data.vehicles.length > 0 && mapLoaded) {
            updateMapMarkers(data.vehicles);
        }
    } catch (error) {
        console.error('Error fetching vehicle positions:', error);
    }
}

// Route line styling using CSS variables
const routeLineStyle = {
    J: { color: getRouteColor('j'), width: 3 },
    K: { color: getRouteColor('k'), width: 3 },
    L: { color: getRouteColor('l'), width: 3 },
    M: { color: getRouteColor('m'), width: 3 },
    N: { color: getRouteColor('n'), width: 3 },
    T: { color: getRouteColor('t'), width: 3 }
};

/**
 * Plots train stops on the map for selected lines
 * @param {Array<Object>} routes - Array of route data
 * @param {string} routes[].line - Train line identifier
 * @param {Array<Object>} routes[].stops - Array of stop data
 */
function plotTrainStops(routes) {
    if (map.getLayer('train-stops')) {
        map.removeLayer('train-stops');
    }
    if (map.getSource('train-stops')) {
        map.removeSource('train-stops');
    }

    const features = [];
    routes.forEach(route => {
        if (!selectedTrainLines[route.line]) return;
        
        route.stops.forEach(stop => {
            if (!stop.lat || !stop.long) return;
            
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(stop.long), parseFloat(stop.lat)]
                },
                properties: {
                    id: stop.id,
                    name: stop.name,
                    line: route.line,
                    color: getRouteColor(route.line)
                }
            });
        });
    });

    map.addSource('train-stops', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });

    map.addLayer({
        id: 'train-stops',
        type: 'circle',
        source: 'train-stops',
        paint: {
            'circle-radius': 6,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mouseenter', 'train-stops', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        
        const coordinates = e.features[0].geometry.coordinates.slice();
        const stopId = e.features[0].properties.id;
        const stopName = e.features[0].properties.name;
        
        popup.setLngLat(coordinates)
            .setHTML(`<strong>Stop #${stopId}</strong><br>${stopName}`)
            .addTo(map);
    });

    map.on('mouseleave', 'train-stops', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });
}

/**
 * Fetches and plots train stops for all lines
 * @async
 * @throws {Error} If fetching stops data fails
 */
async function fetchAndPlotStops() {
    try {
        const response = await fetch('/train-routes.json');
        const data = await response.json();
        if (mapLoaded) {
            plotTrainStops(data.routes);
        }
    } catch (error) {
        console.error('Error fetching train stops:', error);
    }
}

/**
 * Fetches and draws route lines on the map
 * @async
 * @throws {Error} If fetching route data fails
 */
async function fetchAndDrawRoutes() {
    try {
        const response = await fetch('/api/lines');
        const linesData = await response.json();
        
        const railLines = linesData.filter(line => 
            line.LineShortName.match(/^[JKLMNT]$/i)
        );

        for (const line of railLines) {
            const patternResponse = await fetch(`/api/patterns/${line.LineShortName}`);
            const patternData = await patternResponse.json();
            
            if (patternData.Patterns?.Pattern?.PatternPath?.Point) {
                const coordinates = patternData.Patterns.Pattern.PatternPath.Point
                    .map(point => [parseFloat(point.Lon), parseFloat(point.Lat)]);
                
                if (map.getSource(line.LineShortName)) {
                    map.getSource(line.LineShortName).setData({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    });
                } else {
                    map.addLayer({
                        id: line.LineShortName,
                        type: 'line',
                        source: {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: coordinates
                                }
                            }
                        },
                        paint: {
                            'line-color': getRouteColor(line.LineShortName),
                            'line-width': routeLineStyle[line.LineShortName].width
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error drawing routes:', error);
    }
}

/**
 * Updates train markers on the map with current vehicle positions
 * Creates or updates markers with train line colors and direction indicators
 * @param {Array<Object>} vehicles - Array of vehicle position data
 * @param {string} vehicles[].trainId - Train identifier (e.g., "K123")
 * @param {number} vehicles[].direction - Direction (0=inbound, 1=outbound)
 * @param {number} vehicles[].latitude - Vehicle latitude
 * @param {number} vehicles[].longitude - Vehicle longitude
 * @param {string} vehicles[].readableStatus - Human-readable status text
 */
function updateMapMarkers(vehicles) {
    markers.forEach(marker => marker.remove());
    markers = [];

    const selectedVehicles = vehicles.filter(vehicle => {
        const trainLine = trainLines.find(line => vehicle.trainId.startsWith(line));
        return trainLine && selectedTrainLines[trainLine];
    });

    selectedVehicles.forEach(vehicle => {
        const markerContainer = document.createElement('div');
        markerContainer.className = 'marker-container';

        const el = document.createElement('div');
        el.className = 'train-marker';
        el.innerHTML = vehicle.trainId[0];
        el.style.backgroundColor = getRouteColor(vehicle.trainId[0]);
        el.style.color = '#ffffff';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '16px';

        const directionIndicator = document.createElement('div');
        directionIndicator.className = 'direction-indicator';
        directionIndicator.innerHTML = vehicle.direction === 0 ? 'in' : 'out';
        directionIndicator.style.backgroundColor = vehicle.direction === 0 ? '#4CAF50' : '#FFA500';
        directionIndicator.style.color = '#ffffff';
        directionIndicator.style.width = '24px';
        directionIndicator.style.height = '24px';
        directionIndicator.style.borderRadius = '50%';
        directionIndicator.style.display = 'flex';
        directionIndicator.style.justifyContent = 'center';
        directionIndicator.style.alignItems = 'center';
        directionIndicator.style.fontWeight = 'bold';
        directionIndicator.style.fontSize = '10px';
        directionIndicator.style.position = 'absolute';
        directionIndicator.style.top = '-8px';
        directionIndicator.style.right = '-8px';

        markerContainer.appendChild(el);
        markerContainer.appendChild(directionIndicator);

        const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'dark-theme-popup',
            offset: [0, -10]
        }).setHTML(`<h3>Train ${vehicle.trainId}</h3><p>${vehicle.readableStatus}</p>`);

        const marker = new mapboxgl.Marker({
            element: markerContainer,
            anchor: 'center'
        })
        .setLngLat([vehicle.longitude, vehicle.latitude])
        .setPopup(popup)
        .addTo(map);

        el.addEventListener('click', () => {
            markers.forEach(m => m.getPopup().remove());
            popup.addTo(map);
        });

        markers.push(marker);
    });
}

/**
 * Initializes the page by loading stops and setting up initial state
 * @async
 */
async function initializePage() {
    await loadAllStops();
    const inboundStop = allStops.get(currentStops.inbound);
    const outboundStop = allStops.get(currentStops.outbound);
    if (inboundStop) {
        document.getElementById('inbound-location').textContent = inboundStop.name;
    }
    if (outboundStop) {
        document.getElementById('outbound-location').textContent = outboundStop.name;
    }
    generateTrainLineButtons();
    fetchPredictions();
    fetchWeather();
    fetchVehiclePositions();
}

// Update predictions every minute
setInterval(fetchPredictions, 60000);

// Update weather every 15 minutes
setInterval(fetchWeather, 900000);

// Update vehicle positions every minute
setInterval(fetchVehiclePositions, 60000);

// Update time display every second
setInterval(updateTimeDisplay, 1000);

// Call initializePage when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePage);
