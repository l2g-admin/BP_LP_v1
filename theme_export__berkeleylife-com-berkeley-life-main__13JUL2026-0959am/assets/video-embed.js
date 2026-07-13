export function videoEmbed(container, type) {

  if (!container) return;

  const targetVideo = container.querySelector('iframe')
  const videoButton = container.querySelector('[data-embed-button]')
  const videoImage = container.querySelector('iframe ~ img')

  function playVideo() {

    if (type === 'vimeo') {
      // VIMEO
      const vimeoPlayer = 'https://cdn.skypack.dev/@vimeo/player'
      import(vimeoPlayer)
      .then((vimeoPlayer) => {
        console.log(vimeoPlayer)
        const player = new vimeoPlayer.default(targetVideo);
        player.play()
      });
    } else {
      // YOUTUBE
      targetVideo.src = targetVideo.src + '&autoplay=1'
    }
  }

  videoButton.addEventListener('click', () => {
    videoButton.classList.add('hidden')
    videoImage.classList.add('hidden')
    playVideo()
  })
}