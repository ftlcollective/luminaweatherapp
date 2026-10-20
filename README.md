# Lumina Weather

A dreamy, futuristic weather app built with HTML, CSS and JavaScript, powered by the [SheCodes Weather API](https://www.shecodes.io/).

## Features

- Search any city
- Live temperature, weather description and weather icon
- Wind speed, humidity and "feels like" (when the API provides it)
- 7-day forecast with icons, highs, lows, descriptions and wind
- Switch between °C and °F (the API is asked again, so every number is real)
- "Use my location" button
- Recent searches, remembered in your browser
- Background colours that change with the weather
- Friendly messages for unknown cities, blocked location and connection problems

All weather data comes straight from the SheCodes API. Nothing is made up.

## Wind units

The API returns wind speed in metres per second (metric) or miles per hour (imperial), and the app labels it that way.

## Run it locally

Open `index.html` in your browser. No install or build step needed.

## Deploy on Netlify

1. Log in to Netlify with GitHub
2. Add new site, then Import an existing project, then pick this repository
3. Leave the build command empty and set the publish directory to `.`
4. Deploy

## Credits

Based on the SheCodes Meteo starter. Restyled and extended by [ftlcollective](https://github.com/ftlcollective).
