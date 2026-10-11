/**
 * Raw colours for the places CSS cannot reach: the OG images and the icon
 * generator. Pages use the DS tokens in styles/ds instead; these values are
 * the DS light theme ("retícula" paper) so the images match the default page.
 *
 * The project ink is the DS magenta: #D6008F under white text (4.93:1). The
 * dark theme lifts it to #EE6ABE under black and terminal folds it to amber;
 * images only ever use the light pair.
 */
export const brand = {
  ink: "#D6008F",
  onInk: "#FFFFFF",
  paper: "#F4F1EA",
  card: "#FBF9F4",
  sunken: "#EAE6DC",
  text: "#111111",
  text2: "#3A3A3A",
  text3: "#5A5650",
  spot: "#E10600",
} as const
