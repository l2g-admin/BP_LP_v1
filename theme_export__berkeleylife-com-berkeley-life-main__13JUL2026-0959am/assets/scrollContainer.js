export function scrollContainer(container) {
  if (!container) {return}

  const list = container.querySelector('ul')
  const shadowLeft = container.querySelector('[data-shadow-l]')
  const shadowRight = container.querySelector('[data-shadow-r]')
  const buttonLeft = container.querySelector('[data-button-l]')
  const buttonRight = container.querySelector('[data-button-r]')
  let scrollLeftMax;
  let itemWidth = container.querySelectorAll('li')[0].clientWidth || 200
  list.addEventListener('scroll', debounce((event) => {

    scrollLeftMax = list.scrollWidth - list.clientWidth

    if (list.scrollLeft > 0) {
      shadowLeft.classList.remove('opacity-0')
      buttonLeft.removeAttribute('disabled')
    } else if (list.scrollLeft == '0' ) {
      shadowLeft.classList.add('opacity-0')
      buttonLeft.setAttribute('disabled', true)
    }

    if (list.scrollLeft == scrollLeftMax) {
      shadowRight.classList.add('opacity-0')
      buttonRight.setAttribute('disabled', true)
    } else {
      shadowRight.classList.remove('opacity-0')
      buttonRight.removeAttribute('disabled')
    }

  }, 200))

  buttonRight.addEventListener('click', () => {
    console.log(itemWidth)
    list.scrollBy({
      left: itemWidth,
      behavior: 'smooth'
    });
  })

  buttonLeft.addEventListener('click', () => {
    console.log(itemWidth)
    list.scrollBy({
      left: -itemWidth,
      behavior: 'smooth'
    });
  })

}
