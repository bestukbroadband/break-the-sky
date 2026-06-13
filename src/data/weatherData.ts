import { WeatherOption } from '../types';

export const WEATHER_OPTIONS: WeatherOption[] = [
  {
    id: 'morning',
    name: 'Clear Morning',
    timeOfDay: '08:00 AM',
    fogDensity: 0.0003,
    lightColor: '#fef08a', // warm yellow
    lightIntensity: 1.5,
    skyColor: '#bae6fd', // light sky blue
    groundColor: '#3f6212', // fresh green
    description: 'Bright blue skies, crystal clear visibility, calm winds. Ideal for initial flight practice.',
    hasRain: false,
    windSpeed: 2,
  },
  {
    id: 'afternoon',
    name: 'Cloudy Afternoon',
    timeOfDay: '02:00 PM',
    fogDensity: 0.0007,
    lightColor: '#ffffff', // crisp white
    lightIntensity: 1.3,
    skyColor: '#cbd5e1', // overcast blueish-gray
    groundColor: '#1e3a1e',
    description: 'High visibility with broken cumulus clouds scattered nicely across the flight path.',
    hasRain: false,
    windSpeed: 4,
  },
  {
    id: 'sunset',
    name: 'Golden Sunset',
    timeOfDay: '07:30 PM',
    fogDensity: 0.0005,
    lightColor: '#f97316', // orange / red amber
    lightIntensity: 1.4,
    skyColor: '#1e1b4b', // deep cosmic indigo-pink
    groundColor: '#451a03', // warm rust brown
    description: 'Cinematic sunset casting long glowing shadows across the mountain ranges.',
    hasRain: false,
    windSpeed: 6,
  },
  {
    id: 'night',
    name: 'Night Flight',
    timeOfDay: '11:30 PM',
    fogDensity: 0.0004,
    lightColor: '#1e293b', // moon grey-blue
    lightIntensity: 0.2, // dim moonlight
    skyColor: '#020617', // pitch black space blue
    groundColor: '#090d16',
    description: 'Zero sunlight. Airport runway beacons and cockpit instrumentation are your trusty stars.',
    hasRain: false,
    windSpeed: 3,
  },
  {
    id: 'rain',
    name: 'Stormy Rain',
    timeOfDay: '04:00 PM',
    fogDensity: 0.0018,
    lightColor: '#64748b', // cold slate grey
    lightIntensity: 0.6,
    skyColor: '#334155', // dark lightning grey
    groundColor: '#14532d',
    description: 'Heavy precipitation, slick wind currents, and low visibility. For expert pilots.',
    hasRain: true,
    windSpeed: 15,
  },
  {
    id: 'fog',
    name: 'Foggy Conditions',
    timeOfDay: '06:00 AM',
    fogDensity: 0.0060, // thick mist!
    lightColor: '#94a3b8', // uniform soft gray
    lightIntensity: 0.8,
    skyColor: '#e2e8f0', // bright white fog
    groundColor: '#0f172a',
    description: 'Extremely limited runway sight. Rely heavily on dashboard telemetry and instruments for landing.',
    hasRain: false,
    windSpeed: 1,
  },
  {
    id: 'snow',
    name: 'Blizzard Whiteout',
    timeOfDay: '04:30 AM',
    fogDensity: 0.0045,
    lightColor: '#cbd5e1',
    lightIntensity: 0.7,
    skyColor: '#94a3b8',
    groundColor: '#334155',
    description: 'Dense alpine snowfall. Crucial wing freeze drag risks require higher throttle usage to stay aloft.',
    hasRain: false, // will handle customized snow-white visual particles
    windSpeed: 18,
  },
  {
    id: 'aurora',
    name: 'Neon Cosmic Aurora',
    timeOfDay: '01:00 AM',
    fogDensity: 0.0008,
    lightColor: '#a855f7',
    lightIntensity: 1.6,
    skyColor: '#100c28',
    groundColor: '#070512',
    description: 'An ethereal cosmic storm. Highly charged magnetics swirl neon green and violet light vectors with cross-winds.',
    hasRain: false,
    windSpeed: 12,
  },
];
