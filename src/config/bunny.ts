/**
 * Bunny Stream video library used by the Academy.
 *
 * Lessons may store either a full embed URL or just the Bunny video GUID
 * (which is what the Bunny dashboard shows in its list). To play a bare GUID
 * we have to know which library it belongs to.
 *
 * Where to find it: Bunny dashboard → Stream → your video library → any video
 * → "Embed" — the code contains
 *   https://iframe.mediadelivery.net/embed/<LIBRARY_ID>/<video-guid>
 * The number in the middle is the value below.
 *
 * Leave as null if unknown — lessons stored as bare GUIDs will then show a
 * clear "not configured" message instead of silently 404ing.
 */
export const BUNNY_LIBRARY_ID: string | null = '737779';
