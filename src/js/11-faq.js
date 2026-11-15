/* ==================================================================
   FAQ accordion
================================================================== */
$$(".faq__q").forEach((b) =>
  b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") === "true";
    $$('.faq__q[aria-expanded="true"]').forEach((o) => {
      if (o === b) return;
      o.setAttribute("aria-expanded", "false");
      gsap.to(o.nextElementSibling, { height: 0, duration: 0.5, ease: "power3.inOut" });
    });
    b.setAttribute("aria-expanded", String(!open));
    gsap.to(b.nextElementSibling, { height: open ? 0 : "auto", duration: 0.6, ease: "power3.inOut", onComplete: () => ScrollTrigger.refresh() });
  })
);
