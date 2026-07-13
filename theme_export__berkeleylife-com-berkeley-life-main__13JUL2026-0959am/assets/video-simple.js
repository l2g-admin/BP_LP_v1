export function videoSimple(container) {
  if (!container) return;

  const targetVideo = container.querySelector('video')
  const videoButton = container.querySelector('[data-simple-button]')

  videoButton.addEventListener('click', () => {
    videoButton.classList.add('hidden')
    targetVideo.setAttribute('controls', true)
    targetVideo.play()
  })

}