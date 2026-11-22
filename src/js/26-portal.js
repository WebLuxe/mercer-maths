/* ==================================================================
   Portal: every panel change is a flight through two neon rings
================================================================== */
// Going down the page the rings start small in the distance and grow until they pass the edges of the screen;
// going back up they run the other way, so it reads as flying backwards out through them. Two small elements,
// drawn once: only their transform and opacity change, and only for the length of one snap.
if (!reduce) {
  const portal = document.createElement("div");
  portal.className = "portal";
  portal.setAttribute("aria-hidden", "true");
  portal.innerHTML = "<i></i><i></i>";
  document.body.appendChild(portal);
  const rings = [...portal.children];
  gsap.set(rings, { transformPerspective: 900, opacity: 0 });
  bus.on("snap:go", ({ dur, dir }) => {
    gsap.killTweensOf(rings);
    const far = 0.1, near = 10, fwd = dir > 0;
    rings.forEach((r, k) => {
      const lag = k * 0.1;
      gsap.fromTo(r, { scale: fwd ? far : near, rotationX: k ? -28 : 24, rotationY: k ? 16 : -18, rotation: k ? -50 : 30 },
        { scale: fwd ? near : far, rotation: k ? 10 : -20, duration: dur * 0.92, delay: lag, ease: fwd ? "power3.in" : "power3.out" });
      gsap.timeline({ delay: lag })
        .fromTo(r, { opacity: 0 }, { opacity: 1, duration: dur * 0.22, ease: "power1.out" })
        .to(r, { opacity: 0, duration: dur * 0.28, ease: "power1.in" }, dur * 0.64);
    });
  });
}
