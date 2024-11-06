import gameScene from "./gameScene";
import characterCreationScene from "./characterCreationScene";

let scene = undefined;
let isRenderLoopRunning = false;

async function main(engine, currentScene) {
  // Start with the character creation scene
  scene = await characterCreationScene(engine, currentScene);

  startRenderLoop(engine);

  window.addEventListener("resize", () => {
    engine.resize();
  });

  // Listen for scene switch request
  window.addEventListener("switchToGameScene", async () => {
    await switchToGameScene(engine, currentScene);
  });

  window.addEventListener("switchToCharacterCreationScene", async () => {
    await switchToCharacterCreationScene(engine, currentScene);
  });
}

function startRenderLoop(engine) {
  if (!isRenderLoopRunning) {
    isRenderLoopRunning = true; // Set the flag to true

    engine.runRenderLoop(() => {
      if (scene) {
        scene.render();
      }
    });
  }
}

async function switchToGameScene(engine, currentScene) {
  console.log("Switching to game scene..."); // Debug log
  if (scene) {
    scene.dispose(); // Clean up the previous scene
  }

  // Load the new game scene
  scene = await gameScene(engine, currentScene);

  startRenderLoop(engine);
}

async function switchToCharacterCreationScene(engine, currentScene) {
  if (scene) {
    scene.dispose();
  }

  scene = await characterCreationScene(engine, currentScene);
  startRenderLoop(engine);
}

export default main;
