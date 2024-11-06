export default function loadingScreen() {
  const loadingScreenCont = document.querySelector(".loading-screen");
  const label = document.querySelector(".label");

  function openLoadingScreen(textToDisplay) {
    loadingScreenCont.style.display = "flex";
    label.innerHTML = textToDisplay ? textToDisplay : "Loading ...."
  }
  function closeLoadingScreen() {
    loadingScreenCont.style.display = "none";
  }
  return { closeLoadingScreen, openLoadingScreen };
}
