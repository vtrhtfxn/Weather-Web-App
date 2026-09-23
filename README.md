https://github.com/vtrhtfxn/Weather-Web-App
# Daybreak Weather

A responsive weather app for exploring current conditions and the previous and next 24 hours in cities around the world. Built with React, TypeScript, Vite, and the [Open-Meteo](https://open-meteo.com/) weather and geocoding APIs.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. No API key or `.env` file is needed.

## Check and build

```bash
npm test
npm run build
npm run preview
```

`npm run build` creates a deployable static site in `dist/`. Commit the source files to GitHub; `node_modules/`, `dist/`, and local configuration are excluded by `.gitignore`. A hosting service can publish the contents of `dist/` as the live webpage. Asset paths are relative so the build also works under a repository subpath, such as GitHub Pages.

## Features

- Search for a city or location and see its current temperature, condition, wind speed, and the next hour's chance of rain. Matching locations appear as choices when cities share a name.
- Switch between the previous and next 24 hourly readings, with temperature and rain chance in the chart.
- Refresh the selected location without losing the displayed weather during loading or errors.
- On first visit, show Tashkent immediately and request browser location access. If permission is granted, replace the fallback with local weather. The location button can retry later.
- Show dates and times in the selected location's time zone, including across daylight-saving changes.
- Provide loading, empty search, missing location, and network error states.

Weather and geocoding data come from [Open-Meteo](https://open-meteo.com/en/docs) and its [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). The public endpoints require no API key for eligible non-commercial use; review the provider's terms before commercial deployment. Current-location coordinates are sent to Open-Meteo only to fetch the forecast and are not stored by this app.

Forecasts and the past 24 hours are model-based estimates. They can differ from conditions measured at a particular street or weather station.

The panoramic artwork was generated for this project and depicts a generic landscape, not the selected city's actual skyline.

## License

MIT. When creating the GitHub repository, keep your existing `LICENSE` file at the repository root alongside this README.
