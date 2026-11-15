# Mercer Maths

A two-page showcase site for a Mathematics and Additional Mathematics tutor (O Level / IGCSE).

- `index.html`: Profile (the tutor, results, story, reviews)
- `tuition.html`: Tuition (subjects, timetable, 3D lesson carousel, worked example, quiz, fees, FAQ, booking)

Built with Three.js, GSAP + ScrollTrigger, Lenis and SCSS. No build step for the pages themselves.

**This is a demo.** The tutor name, results, prices, timetable and reviews are placeholders.
Portrait photo by Fábio Lucas on Unsplash.

## Editing styles

Edit `scss/style.scss`, then rebuild the CSS:

```
npx sass scss/style.scss css/style.css --style=compressed
```

## Running locally

```
python -m http.server 4823
```

Then open http://127.0.0.1:4823
