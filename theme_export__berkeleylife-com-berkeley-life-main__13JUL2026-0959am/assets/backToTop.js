export function backToTop() {
	document.addEventListener("DOMContentLoaded", function () {
		if (document.querySelector("[data-back-to-top]")) {

			const backToTopButton = document.querySelector(`[data-back-to-top]`);
			const addToCartButtons = document.querySelector('#ProductGrid');
			const footer = document.querySelector("footer");

			let footerIntersection = true;
			let atcIntersection = true;

			let options = {
				root: null,
				rootMargin: "0px",
				threshold: 0.25,
			};

			let callback = (entries, observer) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (entry.target == footer) {
							footerIntersection = true;
						}
						if (entry.target == addToCartButtons) {
							atcIntersection = true;
						}
					} else {
						if (entry.target == footer) {
							footerIntersection = false;
						}
						if (entry.target == addToCartButtons) {
							atcIntersection = false;
						}
					}
				});
				if (footerIntersection || atcIntersection) {
					hideSticky();
				} else {
					showSticky();
				}
			};

			let stickyObserver = new IntersectionObserver(callback, options);

			stickyObserver.observe(footer);
			stickyObserver.observe(addToCartButtons);

			function showSticky() {
				if (backToTopButton.classList.contains("opacity-0")) {
					backToTopButton.classList.remove("opacity-0", "pointer-events-none");
				}
			}
			function hideSticky() {
				if (backToTopButton.classList.contains("opacity-0")) {
					return;
				} else {
					backToTopButton.classList.add("opacity-0", "pointer-events-none");
				}
			}
		}
	});
}
