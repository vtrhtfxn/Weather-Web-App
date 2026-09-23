# Daybreak design system

The app presents weather as a calm editorial instrument. Its hierarchy is location, current reading, conditions, then hourly context.

- **Palette:** warm ivory `#faf8f5`, deep blue ink `#1d3545`, muted blue-gray labels, coral temperature accent `#e87342`, and pale blue rain markers.
- **Type:** DM Serif Display for prominent weather and section headings; DM Sans for controls, data labels, and compact details.
- **Layout:** a broad image-backed hero with text on the left, a single bordered chart surface below, and no repeated dashboard cards.
- **Controls:** a visible search form with a location picker for ambiguous names, dedicated location and refresh actions, and a two-option past/future period switch. All have keyboard focus and text or accessible names.
- **Motion:** restrained hover feedback plus loading rotation and pulse; reduced-motion preferences stop both.
- **Responsive:** the header moves to two rows below 750px; the chart can scroll horizontally on narrow screens while hourly summaries wrap to four columns.

Runtime tokens and component rules live in `src/styles.css`. Weather condition mapping and time handling live in `src/weather.ts`.
