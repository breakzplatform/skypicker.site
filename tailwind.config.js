/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  // The joseli.to DS ships its own element reset (styles/ds/tokens/base.css);
  // Tailwind's preflight would undo its links, headings and form defaults.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
