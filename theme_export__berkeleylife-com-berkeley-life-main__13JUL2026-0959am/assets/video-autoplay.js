export function videoAutoplay(targetVideo) {
    // don't even try anything if there is no video element
    if (!targetVideo) return;

    // set up observer: if the video is in the viewport, play and pause accordingly
    const videoObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        entry.isIntersecting ? entry.target.play() : entry.target.pause()
      };
    });

    // set up the button and its event listeners
    const videoButton = targetVideo.parentElement.querySelector('[data-lazy-video-button]')
    videoButton.addEventListener('click', () => {
      if (targetVideo.paused) {
        targetVideo.play()
        videoObserver.observe(targetVideo);
      } else {
        targetVideo.pause()
        videoObserver.unobserve(targetVideo);
      }
    })

    function handleButton(state) {
      if (state === "play") {
        videoButton.setAttribute('aria-label', 'Pause')
        videoButton.querySelector('[data-icon-play]').setAttribute('hidden', true)
        videoButton.querySelector('[data-icon-pause]').removeAttribute('hidden')
      } else {
        videoButton.setAttribute('aria-label', 'Play')
        videoButton.querySelector('[data-icon-play]').removeAttribute('hidden')
        videoButton.querySelector('[data-icon-pause]').setAttribute('hidden', true)
      }
    }

    targetVideo.addEventListener('play', () => {
      handleButton('play')
    })
    targetVideo.addEventListener('pause', () => {
      handleButton('pause')
    })

    // check if the user is OK with motion
    let motionSafe = true;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      motionSafe = false
      // if they are not, pause the autoplay video
      targetVideo.pause()
      handleButton('pause')
    }

    // run the observer as long as the user is OK with motion
    if (motionSafe) {
      videoObserver.observe(targetVideo);
    }
}