// The name, with "hub" in the brand orange. A component rather than markup repeated on every
// screen, so the wordmark cannot drift apart between the site, the console and the auth pages.
//
// Wrapped in one span because the places that show it - the site header, the console header, the
// auth cards - are flex rows with a gap: loose text nodes would each become a flex item and the
// name would be written "Volley hub".
export default function Wordmark() {
    return (
        <span className="wordmark">
            Volley<span className="wordmark__hub">hub</span>
        </span>
    );
}
