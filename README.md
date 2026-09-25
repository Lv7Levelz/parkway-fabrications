# Parkway Fabrications — fixed GitHub upload build

This build is intentionally FLAT: all HTML, CSS, JS and image files sit in the repository root.

Why: the previous live build had HTML paths such as `assets/cap-laser.jpg`, while the JPGs had been uploaded into the GitHub repository root. That caused the broken images visible on the live site.

## Upload
Extract the ZIP and upload EVERYTHING inside it together to the root of the GitHub repository.
You do not need to create an `assets` folder.

## Demo safety
This is still a presentation/demo build and remains noindex.
