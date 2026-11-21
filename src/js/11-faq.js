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
    bus.emit("faq:toggle", { open: !open, btn: b, panel: b.nextElementSibling });
    gsap.to(b.nextElementSibling, { height: open ? 0 : "auto", duration: 0.6, ease: "power3.inOut", onComplete: () => ScrollTrigger.refresh() });
    // the answer's text fades and rises into the space as it opens (and is simply there when motion is reduced)
    if (!open && !reduce) gsap.fromTo(b.nextElementSibling.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, delay: 0.12, ease: "expo.out", overwrite: true });
  })
);
