export function smakkload() {
  // Basic fade in animations

  // Check if the user is OK with motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    return;
  }

  let elements;
  let parentElements;

  // Selecting all elements to apply animation to
  window.addEventListener("load", () => {
    elements = document.querySelectorAll(`[data-pre]`);
    elements.forEach((element) => {
      const classesToRemove = element.getAttribute('data-pre').split(' ');
      classesToRemove.forEach((item) => {
        element.classList.add(item);
      });
    });

    parentElements = document.querySelectorAll(`[data-parent]`);
    parentElements.forEach((parentEl) => {
      const childrenArr = Array.from(parentEl.children); // Use children instead of childNodes
      let i = 100;
      childrenArr.forEach((child) => {
        child.classList.add(`delay-[${i}ms]`); // Correct usage of template literals
        i += 200;
      });
    });

    createObserver();
  }, false);

  function createObserver() {
    let observer;

    let options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.5
    };

    observer = new IntersectionObserver(handleIntersect, options);
    elements.forEach((element) => {
      observer.observe(element);
    });
  }

  function handleIntersect(entries, observer) {
    entries.forEach((entry) => {
      const classesToRemove = entry.target.getAttribute('data-pre').split(' ');
      const classesToAdd = entry.target.hasAttribute('data-post')
                          ? entry.target.getAttribute('data-post').split(' ')
                          : [];

      if (entry.target.hasAttribute('data-loaded') && !entry.target.hasAttribute('data-repeat')) {
        return;
      }
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-loaded', true);
        classesToRemove.forEach((item) => {
          entry.target.classList.remove(item);
        });
        classesToAdd.forEach((item) => {
          entry.target.classList.add(item);
        });
      } else {
        // Runs on close, if the element has been loaded before; stops from running when window loads
        if (entry.target.hasAttribute('data-loaded') && entry.target.hasAttribute('data-repeat')) {
          classesToAdd.forEach((item) => {
            entry.target.classList.remove(item);
          });
          classesToRemove.forEach((item) => {
            entry.target.classList.add(item);
          });
          entry.target.removeAttribute('data-loaded');
          console.log('close');
        }
      }
    });
  }
}
