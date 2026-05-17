const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);

document.querySelectorAll(".reveal").forEach(section => {
  if (reducedMotion) {
    section.classList.add("is-visible");
  } else {
    revealObserver.observe(section);
  }
});

function formatCount(value, decimals) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function animateCount(element) {
  const target = Number(element.dataset.count);
  const decimals = Number(element.dataset.decimals || 0);
  const duration = 900;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatCount(target * eased, decimals);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatCount(target, decimals);
    }
  }

  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.45 }
);

document.querySelectorAll(".stat-value").forEach(stat => {
  if (reducedMotion) {
    stat.textContent = formatCount(Number(stat.dataset.count), Number(stat.dataset.decimals || 0));
  } else {
    statObserver.observe(stat);
  }
});
