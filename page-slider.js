document.addEventListener('DOMContentLoaded', () => {
  const sliders = document.querySelectorAll('[data-auto-slider]');

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.slider-slide'));
    const dots = Array.from(slider.querySelectorAll('.slider-dot'));

    if (!slides.length) return;

    let activeIndex = 0;

    const updateSlider = (nextIndex) => {
      activeIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === activeIndex);
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
      });
    };

    updateSlider(0);
    window.setInterval(() => updateSlider(activeIndex + 1), 4000);
  });
});
