// display mobile menu on click
const mobileMenu = document.querySelector(".mobile-menu")
const mobileTags = document.querySelectorAll(".mobile-tags")
const iconDown = document.querySelector(".icon-down")

mobileMenu.addEventListener("click", function() {
  iconDown.classList.toggle("rotate-180");
  mobileTags.forEach(function (tag) {
    if (tag.hasAttribute("open")){
    tag.classList.add("hidden")
    tag.classList.remove("block")
    tag.removeAttribute("open")
    }
    else {
      tag.classList.remove("hidden")
      tag.classList.add("block")
      tag.setAttribute("open", "")
    }
  })
})