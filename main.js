import { Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import main from "./scene/main";

const canvas = document.querySelector("canvas");

let engine = new Engine(canvas, true);

let currentScene = new Scene(engine);

const camera = new FreeCamera("camera1", new Vector3(0, 0, 0), currentScene);

await main(engine, currentScene);
