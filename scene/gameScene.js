import "@babylonjs/loaders";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
import {
  ActionManager,
  BoundingInfo,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scalar,
  Sound,
  SoundTrack,
  StandardMaterial,
  TransformNode,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  TextBlock,
} from "@babylonjs/gui";
import loadingScreen from "../tools/loadingScreen";

function createGround(scene) {
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 50, height: 50 },
    scene
  );

  const groundMat = new StandardMaterial("groundMat", scene);
  const diffuseTex = new Texture("./textures/rocky_trail_diffuse.jpg", scene);
  const normalTex = new Texture("./textures/rocky_trail_normal.jpg", scene);
  groundMat.diffuseTexture = diffuseTex;
  groundMat.normalTexture = normalTex;

  diffuseTex.uScale = 10;
  diffuseTex.vScale = 10;
  normalTex.vScale = 10;
  normalTex.vScale = 10;

  groundMat.specularColor = new Color3(0, 0, 0);

  ground.material = groundMat;
}

const { closeLoadingScreen, openLoadingScreen } = loadingScreen();

async function gameScene(engine, currentScene) {
  openLoadingScreen("Loading Game ...");
  let GAMEOVER = false;
  let isMoving = false;
  let targetName = undefined;
  let targetId = undefined;
  let damageTimeout;
  let attackInterval;
  let isAttacking = false;
  // hero details
  let heroLife = { currHp: 100, maxHp: 100 };
  let characterSpeed = 4;
  let heroDamage = 25;
  let ourTargetPos; // Vector 3
  let heroLvl = 1;
  let equippedItems = JSON.parse(localStorage.getItem("Equipped items"));
  const scene = new Scene(engine);
  console.log(equippedItems);

  const cam = new FreeCamera("camera", new Vector3(0, 0, -5), scene);
  // cam.attachControl();
  const light = new HemisphericLight("light", new Vector3(0, 20, 0), scene);

  // Character Sound
  const slashSound = new Sound(
    "slashSound",
    "/audio/singleswordSlash.wav",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 0.2,
    }
  );

  const runningSound = new Sound(
    "runningSound",
    "/audio/running.wav",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 1,
    }
  );
  runningSound.setPlaybackRate(1.5);

  // Goblin Sound
  const goblinDeathSound = new Sound(
    "goblinDeath",
    "/audio/goblinDeathS.mp3",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 0.2,
    }
  );

  const goblinHitSound = new Sound(
    "goblinhit",
    "/audio/goblinHitS.mp3",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 0.1,
    }
  );

  // Demonoid Sound
  const demonoidHitSound = new Sound(
    "demonoidHit",
    "/audio/demonoidHit.mp3",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 0.1,
    }
  );

  const demonoidDeathSound = new Sound(
    "demonoidDeath",
    "/audio/demonoidDeath.mp3",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
      volume: 0.2,
    }
  );

  // Soundtracks

  const soundTrack = new Sound(
    "soundTrack",
    "/soundtracks/Irkalla_Trailer_v3_mstr.wav",
    scene,
    null,
    {
      loop: true,
      autoplay: true,
      volume: 0.3,
    }
  );

  // import tree
  const TreeMain = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "tree.glb",
    scene
  );
  const tree = TreeMain.meshes[1];
  tree.parent = null;
  TreeMain.meshes[0].dispose();

  let trees = [];
  let treeLength = 30;
  let radius = 25;
  for (let i = 0; i <= treeLength; i++) {
    const treeId = `${Math.random().toLocaleString()}${Math.random().toLocaleString()}`;
    const randomX = Scalar.RandomRange(-radius, radius);
    const randomZ = Scalar.RandomRange(-radius, radius);

    const treeClone = tree.clone("tree");
    treeClone.id = treeId;
    treeClone.position = new Vector3(randomX, 0, randomZ);
    // const lifeBarUi = createLifeBar(treeClone, 100, 100, scene, 5);
    // const treeNameMesh = createTextMesh(
    //   "Evil Tree",
    //   "red",
    //   scene,
    //   treeClone,
    //   6
    // );
    const treeDetails = {
      _id: treeId,
      mesh: treeClone,
      hp: 100,
      maxHp: 100,
      // lifeBarUi,
      // treeNameMesh,
    };
    trees.push(treeDetails);
  }
  tree.dispose();

  // character creation
  const Model = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "gameCharac.glb",
    scene
  );
  const anims = Model.animationGroups;
  const meshes = Model.meshes;
  const rootMesh = meshes[0];
  const characterBox = MeshBuilder.CreateBox(
    "characterBox",
    { size: 0.9, height: 2 },
    scene
  );
  rootMesh.parent = characterBox;
  characterBox.visibility = 0;
  rootMesh.position.y = -1;
  characterBox.position.y += 1;
  characterBox.isPickable = false;
  meshes.forEach((mesh) => (mesh.isPickable = false));
  rootMesh.addRotation(0, Math.PI, 0);

  createTextMesh(equippedItems.characterName, "white", scene, characterBox, 2);

  anims.forEach((anim) => anim.name === "0idle" && anim.play(true));

  // Helper function to toggle armor parts

  meshes.forEach((mesh) => {
    const isEquipped = Object.values(equippedItems).some(
      (itemName) => itemName && mesh.name === itemName
    );
    mesh.visibility = isEquipped ? 1 : mesh.name === "bodyp" ? 1 : 0;
  });

  // Load all sword models
  const swordModels = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "swords.glb",
    scene
  );

  const equippedWeaponName = equippedItems.weapon;

  // Hide all swords initially
  swordModels.meshes.forEach((mesh) => {
    mesh.isVisible = false; // Hide all swords by default
  });

  // Filter to find the meshes for the equipped sword
  const equippedSwordMeshes = swordModels.meshes.filter((mesh) =>
    mesh.name.includes(equippedWeaponName)
  );

  // Attach the sword to the hand if it exists
  if (equippedSwordMeshes.length > 0) {
    // Find the right hand bone of the character
    const rightHandBone = Model.skeletons[0].bones.find(
      (bone) => bone.name === "hand.R"
    );

    if (rightHandBone) {
      // Create a holder node to position the sword
      const swordHolder = new TransformNode("swordHolder", scene);

      // Attach the swordHolder to the hand bone
      rightHandBone.getTransformNode().addChild(swordHolder);

      // Set the sword holder's position and rotation to align with the hand
      swordHolder.position = new Vector3(0, 0.5, 0);
      swordHolder.rotation = new Vector3(0, 0, Math.PI / 2);

      // Attach and adjust each part of the equipped sword mesh
      equippedSwordMeshes.forEach((swordMesh) => {
        swordMesh.parent = swordHolder;
        swordMesh.isVisible = true; // Make the equipped sword part visible
        swordMesh.scaling = new Vector3(0.1, 0.1, 0.1); // Scale down if needed
        swordMesh.position = new Vector3(0, 0, 0);
        swordMesh.rotation = new Vector3(Math.PI / 2, 0, 0); // Adjust based on hand orientation
      });
    } else {
      console.log("Hand bone not found!");
    }
  } else {
    console.log("Equipped sword not found in sword models!");
  }

  // Load all shield models
  const shieldModels = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "shields.glb",
    scene
  );

  const equippedShieldName = equippedItems.shield;

  // Hide all shields initially
  shieldModels.meshes.forEach((mesh) => {
    mesh.isVisible = false;
  });

  // Find the specific shield meshes you want to equip
  const equippedShieldMeshes = shieldModels.meshes.filter((mesh) =>
    mesh.name.includes(equippedShieldName)
  );
  // Attach the shield to the left hand if it exists
  if (equippedShieldMeshes.length > 0) {
    const leftHandBone = Model.skeletons[0].bones.find(
      (bone) => bone.name === "hand.L"
    );

    if (leftHandBone) {
      // Create a holder node to position the shield
      const shieldHolder = new TransformNode("shieldHolder", scene);

      // Attach the shieldHolder to the left hand bone
      leftHandBone.getTransformNode().addChild(shieldHolder);

      // Set the shield holder's position and rotation to align with the hand
      shieldHolder.position = new Vector3(0, 0, 0);
      shieldHolder.rotation = new Vector3(0, 0, 0);

      // Attach and adjust each part of the shield mesh
      equippedShieldMeshes.forEach((shieldMesh) => {
        shieldMesh.parent = shieldHolder;
        shieldMesh.isVisible = true;
        shieldMesh.scaling = new Vector3(0.2, 0.2, 0.2); // Scale down if too large
        shieldMesh.position = new Vector3(0.05, 0.2, 0);
        shieldMesh.rotation = new Vector3(0, 0, 0); // Adjust as needed
      });
    } else {
      console.log("Left hand bone not found!");
    }
  } else {
    console.log("Shield mesh not found!");
  }

  // character creation

  // create life UI
  const { mcLifeTotal, redRectangle, heroLevelText } = createLifeUI(
    heroLife.currHp,
    heroLife.maxHp,
    heroLvl
  );

  // create ground
  createGround(scene);

  // CREATE ENEMIES
  let enemies = [];

  // spawn goblins
  let goblinSpawnInterval = 6000;
  let goblinRootMesh = await SceneLoader.LoadAssetContainerAsync(
    "/models/",
    "goblinGreen.glb",
    scene
  );
  goblinSpawnInterval = setInterval(() => {
    if (GAMEOVER) return clearInterval(goblinSpawnInterval);
    const goblinId = `enemy${Math.random()}`;
    const goblinDetails = {
      _id: goblinId,
      name: "Goblin",
      hp: 100,
      maxHp: 100,
      dmg: 10,
      isMoving: false,
      spd: 2,
      pos: { x: Scalar.RandomRange(-25, 25), z: Scalar.RandomRange(-25, 25) },
      boxDetail: { size: 1, height: 2 },
      atkSpeed: 1400,
      lifeBarHeight: 1.4,
      hitSound: goblinHitSound,
      deathSound: goblinDeathSound,
    };
    createEnemy(goblinDetails, scene, goblinRootMesh);
    // console.log("goblin Details:", goblinDetails);
  }, goblinSpawnInterval);

  // spawn demonoid
  const demonoidRootMesh = await SceneLoader.LoadAssetContainerAsync(
    "/models/",
    "demonoid.glb",
    scene
  );
  const demonoidId = `enemy_demonoid${Math.random()}`;
  const demonoidDetails = {
    _id: demonoidId,
    name: "Demonoid",
    hp: 200,
    maxHp: 200,
    dmg: 40,
    isMoving: false,
    spd: 4,
    // pos: { x: Scalar.RandomRange(-25, 25), z: Scalar.RandomRange(-25, 25) },
    pos: { x: 0, z: 0 },
    boxDetail: { size: 1.5, height: 4 },
    atkSpeed: 1600,
    lifeBarHeight: 3,
    hitSound: demonoidHitSound,
    deathSound: demonoidDeathSound,
  };
  createEnemy(demonoidDetails, scene, demonoidRootMesh);
  // console.log("demonoid details:",demonoidDetails);

  //camera
  const cameraContainer = MeshBuilder.CreateGround(
    "ground",
    { width: 0.5, height: 0.5 },
    scene
  );
  cameraContainer.position = new Vector3(0, 15, 0);
  // cameraContainer.position = new Vector3(0, 5, -2.5);
  cameraContainer.addRotation(0, Math.PI, 0);

  cam.parent = cameraContainer;
  cam.setTarget(new Vector3(0, -10, 0));

  let camVertical = 0;
  let camHorizontal = 0;
  let camSpd = 3;

  window.addEventListener("keydown", (e) => {
    const theKey = e.key.toLowerCase();

    if (theKey === "arrowup") camVertical = 1;
    if (theKey === "arrowdown") camVertical = -1;
    if (theKey === "arrowleft") camHorizontal = -1;
    if (theKey === "arrowright") camHorizontal = 1;
  });

  window.addEventListener("keyup", (e) => {
    const theKey = e.key.toLowerCase();

    if (theKey === "arrowup") camVertical = 0;
    if (theKey === "arrowdown") camVertical = 0;
    if (theKey === "arrowleft") camHorizontal = 0;
    if (theKey === "arrowright") camHorizontal = 0;
  });

  let currentEnemyTarget = null; // Tracks the last targeted enemy
  scene.onPointerDown = (e) => {
    if (GAMEOVER) return;
    if (e.buttons === 1) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
      if (!pickInfo.hit) return;

      if (runningSound.isPlaying) {
        runningSound.stop();
      }

      targetName = pickInfo.pickedMesh.name;
      targetId = pickInfo.pickedMesh.id;

      pickInfo.pickedPoint.y = characterBox.position.y;
      ourTargetPos = pickInfo.pickedPoint;
      const distance = calculateDistance(ourTargetPos, characterBox.position);
      if (targetName === "ground") {
        currentEnemyTarget = null; // Reset target when ground is clicked
        if (distance < 0.1) return console.log("we are near on our target");
        Move(ourTargetPos);
      }
      if (targetName === "tree") {
        if (distance < 1) return InitializeAttack(ourTargetPos);
        Move(ourTargetPos);
      }
      if (targetName.includes("enemy")) {
        // Check if the clicked enemy is the same as the current target
        if (currentEnemyTarget === targetName) {
          return; // Do nothing if it's the same enemy
        }

        currentEnemyTarget = targetName; // Update target if it's a different enemy
        if (distance < 1) return InitializeAttack(ourTargetPos);
        Move(ourTargetPos);
      }
    }
  };

  function calculateDistance(targetPos, ourPos) {
    return Vector3.Distance(targetPos, ourPos);
  }

  function Move(directionPos) {
    clearInterval(attackInterval);
    clearTimeout(damageTimeout);
    isMoving = true;
    isAttacking = false;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);
    anims.forEach((anim) => anim.name === "0Idle" && anim.stop());
    anims.forEach((anim) => anim.name === "slash.0" && anim.stop());
    anims.forEach((anim) => anim.name === "running.weapon" && anim.play(true));
    runningSound.play();
  }

  function Stop() {
    clearInterval(attackInterval);
    clearTimeout(damageTimeout);
    isMoving = false;
    anims.forEach((anim) => anim.name === "running.weapon" && anim.stop());
    anims.forEach((anim) => anim.name === "0Idle" && anim.play(true));
    ourTargetPos = undefined;
    runningSound.stop();
  }

  function InitializeAttack() {
    //check if the character is aready attacking
    if (isAttacking) return;

    clearInterval(attackInterval);
    anims.forEach((anim) => anim.name === "running.weapon" && anim.stop());
    runningSound.stop();
    Attack(ourTargetPos);
    attackInterval = setInterval(() => {
      if (GAMEOVER) return clearInterval(attackInterval);
      Attack(ourTargetPos);
    }, 2000);
  }

  function Attack(directionPos) {
    const treeDetail = trees.find((tree) => tree._id === targetId);
    const enemyDetail = enemies.find((enemy) => enemy._id === targetId);

    if (targetName === "tree" && !treeDetail)
      return console.log("target tree not found");
    if (targetName.includes("enemy") && !enemyDetail)
      return console.log("enemy not found");

    let targetDetail;
    if (targetName === "tree") targetDetail = treeDetail;
    if (targetName.includes("enemy")) targetDetail = enemyDetail;

    isMoving = false;
    isAttacking = true;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);

    anims.forEach((anim) => anim.name === "0Idle" && anim.stop());
    anims.forEach((anim) => anim.name === "running.weapon" && anim.stop());
    anims.forEach((anim) => anim.name === "slash.0" && anim.play());

    damageTimeout = setTimeout(() => {
      const hpAfterDamage = targetDetail.hp - heroDamage;
      targetDetail.hp = hpAfterDamage;
      slashSound.play();
      if (hpAfterDamage <= 0) {
        if (targetName === "tree")
          trees = trees.filter((tree) => tree._id !== targetId);
        if (targetName.includes("enemy")) {
          enemyDetail.anims.forEach(
            (anim) => anim.name === "attack0" && anim.stop()
          );
          enemyDetail.anims.forEach(
            (anim) => anim.name === "0Idle" && anim.stop()
          );
          enemyDetail.anims.forEach(
            (anim) => anim.name === "death" && anim.play()
          );
          enemies = enemies.filter((enemy) => enemy._id !== targetId);

          targetId = undefined;
          ourTargetPos = undefined;
          isAttacking = false;

          anims.forEach((anim) => anim.name === "0Idle" && anim.play());
          anims.forEach((anim) => anim.name === "slash.0" && anim.stop());
          enemyDetail.deathSound.play();
          Stop();
          setTimeout(() => {
            return targetDetail.mesh.dispose();
          }, 10000);

          targetDetail.mesh.isPickable = false;

          heroLife.maxHp += 10;
          heroLife.currHp = heroLife.maxHp + 10;
          heroLvl += 1;
          heroDamage += 5;
          heroLevelText.text = `lvl. ${heroLvl}`;

          console.log(heroDamage);
        } else {
          return targetDetail.mesh.dispose();
        }
      }

      targetDetail.lifeBarUi.width = `${
        (targetDetail.hp / targetDetail.maxHp) * 100 * 1
      }px`;
    }, 800);
  }

  function createLifeUI(currLife, maxLife, herolvl) {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const redRectangle = new Rectangle();
    redRectangle.width = `${(currLife / maxLife) * 100 * 2}px`;
    redRectangle.height = "22px";
    redRectangle.cornerRadius = 5;
    redRectangle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    redRectangle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    redRectangle.top = "15px";
    redRectangle.left = "15px";
    redRectangle.background = "red";
    redRectangle.thickness = 0;

    advancedTexture.addControl(redRectangle);

    // border container for our life UI
    const borderForLife = new Rectangle();
    borderForLife.width = `${(maxLife / maxLife) * 100 * 2 + 10}px`;
    borderForLife.height = "30px";
    borderForLife.cornerRadius = 5;
    borderForLife.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    borderForLife.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    borderForLife.top = "11px";
    borderForLife.left = "10px";
    borderForLife.background = "black";
    borderForLife.thickness = 2;
    borderForLife.color = "gray";
    borderForLife.zIndex = -1;

    advancedTexture.addControl(borderForLife);

    const mcLifeTotal = new TextBlock();
    mcLifeTotal.width = `${(maxLife / maxLife) * 100 * 2}px`;
    mcLifeTotal.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    mcLifeTotal.height = "25px";
    mcLifeTotal.color = "white";
    mcLifeTotal.text = `${currLife}/${maxLife}`;
    mcLifeTotal.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    mcLifeTotal.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    mcLifeTotal.top = "15px";
    mcLifeTotal.left = "15px";

    advancedTexture.addControl(mcLifeTotal);

    const heroLevelText = new TextBlock();
    heroLevelText.width = `${(maxLife / maxLife) * 100 * 2}px`;
    heroLevelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    heroLevelText.height = "20px";
    heroLevelText.color = "white";
    heroLevelText.text = `lvl. ${heroLvl}`;
    heroLevelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    heroLevelText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    heroLevelText.top = "50px";
    heroLevelText.left = "15px";

    advancedTexture.addControl(heroLevelText);

    return { mcLifeTotal, redRectangle, heroLevelText };
  }

  function createLifeBar(parent, hp, maxHp, scene, posY) {
    const lifeBar = Mesh.CreatePlane("lifeBar", 4, scene);
    lifeBar.billboardMode = Mesh.BILLBOARDMODE_ALL;
    lifeBar.parent = parent;

    const lifeBarTexture = AdvancedDynamicTexture.CreateForMesh(lifeBar);
    lifeBar.position = new Vector3(0, posY ? posY : 4, 0);
    lifeBar.isPickable = false;

    const currentLife = (hp / maxHp) * 100 * 1;
    // console.log(currentLife);
    const lifeBarUi = new Rectangle();
    lifeBarUi.width = `${currentLife + 10}px`;
    lifeBarUi.height = "16px";
    // lifeBarUi.cornerRadius = 20;
    // lifeBarUi.color = "Orange";
    // lifeBarUi.thickness = 4;
    lifeBarUi.background = "green";
    lifeBarTexture.addControl(lifeBarUi);
    return lifeBarUi;
  }

  function createTextMesh(textToDisplay, color, scene, theParent, posY) {
    const nameId = `text${Math.random()}`;
    const nameMesh = Mesh.CreatePlane(nameId, 4, scene);
    nameMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const textureForName = AdvancedDynamicTexture.CreateForMesh(nameMesh);
    nameMesh.isPickable = false;
    nameMesh.isVisible = true;

    let nameText = new TextBlock();
    nameText.text = textToDisplay;
    nameText.color = color;
    nameText.fontSize = 40;
    nameText.height = 50;
    nameText.width = 150;
    nameText.fontWeight = "bold";
    textureForName.addControl(nameText);

    nameMesh.parent = theParent;
    nameMesh.position = new Vector3(0, posY ? posY : 2, 0);

    return nameMesh;
  }

  function createEnemy(pawnDetail, scene, rootMesh) {
    // if (scene.getMeshByName(pawnDetail._id)) return
    const { x, z } = pawnDetail.pos;
    const body = MeshBuilder.CreateBox(
      pawnDetail._id,
      pawnDetail.boxDetail,
      scene
    );
    body.id = pawnDetail._id;
    body.position = new Vector3(x, 1, z);
    body.visibility = 0;

    const duplicate = rootMesh.instantiateModelsToScene();
    // console.log("duplicate",body);
    duplicate.animationGroups.forEach(
      (ani) => (ani.name = ani.name.split(" ")[2])
    );
    const anims = duplicate.animationGroups;

    anims.forEach((anim) => anim.name === "0Idle" && anim.play(true));
    duplicate.rootNodes[0].parent = body;
    duplicate.rootNodes[0].position.y -= 1;
    duplicate.rootNodes[0].addRotation(0, Math.PI, 0);
    // console.log("Enemy anims:", anims);

    const nameMesh = createTextMesh(pawnDetail.name, "red", scene, body, 2);

    const lifeBarUi = createLifeBar(
      body,
      pawnDetail.hp,
      pawnDetail.maxHp,
      scene,
      pawnDetail.lifeBarHeight
    );
    lifeBarUi.background = "green";

    const enemyDet = {
      _id: pawnDetail._id,
      name: pawnDetail.name,
      mesh: body,
      anims,
      moving: pawnDetail.isMoving,
      attacking: false,
      hp: pawnDetail.hp,
      maxHp: pawnDetail.maxHp,
      spd: pawnDetail.spd,
      dmg: pawnDetail.dmg,
      lifeBarUi,
      boxDetail: pawnDetail.boxDetail,
      atkSpeed: pawnDetail.atkSpeed,
      lifeBarHeight: pawnDetail.lifeBarHeight,
      hitSound: pawnDetail.hitSound,
      deathSound: pawnDetail.deathSound,
    };

    enemies.push(enemyDet);

    let damageTakenTimeout;
    let enemyIsAttacking = false; // Flag to check if currently attacking
    let attackingInterval = setInterval(() => {
      if (GAMEOVER) return clearInterval(attackingInterval);

      const theEnemy = enemies.find((enemy) => enemy._id === pawnDetail._id);
      if (!theEnemy) {
        clearInterval(attackingInterval);

        return console.log("this monster is already dead");
      }

      // Check the distance to the hero
      const distance = calculateDistance(body.position, characterBox.position);

      if (distance <= 1 && !enemyIsAttacking) {
        enemyIsAttacking = true; // Set the flag to true to indicate the goblin is attacking
        anims.forEach((anim) => anim.name === "attack0" && anim.play());
        pawnDetail.hitSound.play();
        damageTakenTimeout = setTimeout(() => {
          const currentDistance = calculateDistance(
            body.position,
            characterBox.position
          );
          if (currentDistance < 1) {
            deductHeroLife(pawnDetail.dmg);
          }
          // Reset the attacking flag after the attack is done
          enemyIsAttacking = false;
        }, 700);
      }
    }, pawnDetail.atkSpeed);
  }

  function deductHeroLife(enemyDmg) {
    heroLife.currHp -= enemyDmg;
    if (heroLife.currHp <= 0) return gameOver();
    redRectangle.width = `${(heroLife.currHp / heroLife.maxHp) * 100 * 2}px`;
    mcLifeTotal.text = `${heroLife.currHp} / ${heroLife.maxHp}`;
  }

  function gameOver() {
    GAMEOVER = true;
    redRectangle.width = `${(0 / heroLife.maxHp) * 100 * 2}px`;
    mcLifeTotal.text = `${0} / ${heroLife.maxHp}`;

    // Stop animations
    anims.forEach((anim) => {
      if (anim.name.includes("0Idle")) anim.stop();
      if (anim.name === "death") {
        anim.play();
      } else {
        anim.stop();
      }
    });

    // Show the "restart" button after 2 seconds
    setTimeout(() => {
      scene.dispose();
      openLoadingScreen("GAME OVER");

      // show the restart button
      const restartButton = document.getElementById("restartButton");
      restartButton.style.display = "block";

      restartButton.onclick = () => {
        restartGame();
      };
    }, 2000);
  }

  function restartGame() {
    // hide restart button
    const restartButton = document.getElementById("restartButton");
    restartButton.style.display = "none";

    GAMEOVER = false;

    openLoadingScreen("Restarting Game...");
    // Dispatch a custom event to switch scenes
    enemies.forEach((enemy) => enemy.mesh.dispose());
    enemies = []; // Clear the enemies array

    clearInterval(attackInterval);
    clearTimeout(damageTimeout);
    isMoving = false;

    slashSound.stop();
    slashSound.dispose();
    runningSound.stop();
    runningSound.dispose();
    soundTrack.stop();
    soundTrack.dispose();

    anims.forEach((anim) => anim.name === "0Idle" && anim.stop());
    anims.forEach((anim) => anim.name === "slash.0" && anim.stop());
    anims.forEach((anim) => anim.name === "running.weapon" && anim.stop());

    localStorage.removeItem("Equipped items");

    const characterCreation =
      document.getElementsByClassName("character-creation");
    for (let i = 0; i < characterCreation.length; i++) {
      characterCreation[i].style.display = "block";
    }
    const event = new Event("switchToCharacterCreationScene");
    window.dispatchEvent(event);

    // Ensure the engine is stopped before switching scenes
    if (engine) {
      engine.stopRenderLoop(); // Stop the render loop
    }

    // Reinitialize everything (starting fresh)
    currentScene.dispose(); // Dispose of the current scene (if any)
  }

  scene.registerAfterRender(() => {
    const deltaTime = engine.getDeltaTime() / 1000;
    cameraContainer.locallyTranslate(
      new Vector3(
        camHorizontal * camSpd * deltaTime,
        0,
        camVertical * camSpd * deltaTime
      )
    );

    // Keep camera container aligned with character position
    cameraContainer.position.x = characterBox.position.x;
    cameraContainer.position.z = characterBox.position.z;

    if (isMoving && ourTargetPos !== undefined) {
      const distance = calculateDistance(ourTargetPos, characterBox.position);
      // console.log(distance);
      if (targetName === "ground") if (distance < 0.1) return Stop();
      if (targetName === "tree") if (distance < 1) return InitializeAttack();
      if (targetName.includes("enemy"))
        if (distance <= 2) return InitializeAttack();

      characterBox.locallyTranslate(
        new Vector3(0, 0, characterSpeed * deltaTime)
      );
    }

    enemies.forEach((enemy) => {
      const distance = calculateDistance(
        enemy.mesh.position,
        characterBox.position
      );

      if (distance <= 4 && distance > 1) {
        // Start chasing if within 4 units but greater than 1 unit distance
        enemy.moving = true;
      }

      if (enemy.moving) {
        if (distance >= 10 || distance < 1) {
          // Stop chasing if distance is greater than 10 or less than 1
          enemy.moving = false;
          enemy.anims.forEach((anim) => anim.name === "running" && anim.stop());
          enemy.anims.forEach(
            (anim) => anim.name === "0Idle" && anim.play(true)
          );
        } else {
          // Move towards the character and play the running animation
          enemy.mesh.lookAt(characterBox.position);
          enemy.mesh.locallyTranslate(new Vector3(0, 0, enemy.spd * deltaTime));
          enemy.anims.forEach((anim) => anim.name === "running" && anim.play());
        }
      }
    });
  });

  await scene.whenReadyAsync();
  closeLoadingScreen();
  currentScene.dispose();
  return scene;
}

export default gameScene;
