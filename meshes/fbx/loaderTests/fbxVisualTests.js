// Babylon.js FBX loader — visual regression scenes.
//
// Used by the FBX loader PR's visualization config (scriptToRun + functionToCall). Each Create*
// function loads one model from this folder, frames it with a fixed orbit camera and a neutral
// light rig, and renders single-sided (backface culling on) to match Maya's viewport and surface
// reversed winding / inverted normals. Model paths use "/assets/..."; the visualization harness
// rewrites that prefix to the CDN Assets root, so this works once the models are live on the CDN.
//
// Camera/seek presets mirror the generator's validated render config
// (babylon-fbx/tools/fbx-test-generator/viewConfig.mjs) so these renders match the Maya-faithful set.
(function () {
    "use strict";

    var BASE = "/assets/meshes/fbx/loaderTests/";

    function buildScene(engine, file, view) {
        view = view || {};
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.16, 0.16, 0.18, 1.0);

        // A placeholder active camera so the harness always has one during the async load; it is
        // replaced by a framed camera (or the file's own camera) once the model is available.
        var placeholder = new BABYLON.ArcRotateCamera("fbxPlaceholder", view.alpha, view.beta, 4, BABYLON.Vector3.Zero(), scene);

        // Neutral rig — removed below if the file provides its own lights (e.g. m15).
        var hemi = new BABYLON.HemisphericLight("fbxHemi", new BABYLON.Vector3(0.3, 1.0, 0.25), scene);
        hemi.intensity = 0.9;
        hemi.groundColor = new BABYLON.Color3(0.25, 0.25, 0.3);
        var dir = new BABYLON.DirectionalLight("fbxDir", new BABYLON.Vector3(-0.6, -1.0, -0.8), scene);
        dir.intensity = 0.9;

        BABYLON.SceneLoader.Append(BASE, file, scene, function () {
            // The file brought its own lights — drop the neutral rig so only the authored lights remain.
            if (scene.lights.length > 2) {
                hemi.dispose();
                dir.dispose();
            }

            // Single-sided everywhere, exactly like Maya's Lambert viewport.
            for (var i = 0; i < scene.materials.length; i++) {
                scene.materials[i].backFaceCulling = true;
            }

            // Pin any animation to a deterministic frame (seek is 0..1 within the clip).
            var seek = view.seek != null ? view.seek : 0.5;
            for (var g = 0; g < scene.animationGroups.length; g++) {
                var grp = scene.animationGroups[g];
                grp.start(false);
                grp.goToFrame(grp.from + (grp.to - grp.from) * seek);
                grp.pause();
            }

            if (view.useFbxCamera) {
                // Render through the file's own (FBX-authored) perspective camera (m15).
                var fbxCam = null;
                for (var c = 0; c < scene.cameras.length; c++) {
                    if (/persp/i.test(scene.cameras[c].name)) {
                        fbxCam = scene.cameras[c];
                        break;
                    }
                }
                fbxCam = fbxCam || scene.cameras[scene.cameras.length - 1];
                if (fbxCam) {
                    scene.activeCamera = fbxCam;
                }
            } else {
                // Auto-frame the loaded content, then apply the preset orbit angles.
                scene.createDefaultCamera(true, true, false);
                var cam = scene.activeCamera;
                cam.alpha = view.alpha;
                cam.beta = view.beta;
                cam.radius = cam.radius * 1.15;
            }
        });

        return scene;
    }

    // Per-model view config (alpha/beta orbit, optional seek and FBX-camera flag).
    var PI = Math.PI;
    var MODELS = [
        { fn: "CreateFbxCubePhong", file: "m01_cube_phong.fbx", view: { alpha: -PI / 4, beta: PI / 3 } },
        { fn: "CreateFbxNgons", file: "m02_geo_ngons.fbx", view: { alpha: PI / 2, beta: PI / 2 } },
        { fn: "CreateFbxNormals", file: "m03_normals.fbx", view: { alpha: -PI / 2.3, beta: PI / 2.4 } },
        { fn: "CreateFbxMaterials", file: "m04_material_properties.fbx", view: { alpha: -PI / 2, beta: PI / 2.2 } },
        { fn: "CreateFbxTextures", file: "m05_textures.fbx", view: { alpha: PI / 2, beta: PI / 2 } },
        { fn: "CreateFbxUvTransform", file: "m06_uv_transform.fbx", view: { alpha: PI / 2, beta: PI / 2 } },
        { fn: "CreateFbxMultiMaterial", file: "m07_multimaterial.fbx", view: { alpha: -PI / 3.2, beta: PI / 3 } },
        { fn: "CreateFbxTransforms", file: "m08_transforms.fbx", view: { alpha: -PI / 2.3, beta: PI / 2.3 } },
        { fn: "CreateFbxSkinning", file: "m09_skinning.fbx", view: { alpha: -PI / 2, beta: PI / 2 } },
        { fn: "CreateFbxMorph", file: "m10_morph.fbx", view: { alpha: -PI / 3, beta: PI / 3.4 } },
        { fn: "CreateFbxNodeAnim", file: "m11_node_anim.fbx", view: { alpha: -PI / 2.4, beta: PI / 2.3, seek: 40 / 60 } },
        { fn: "CreateFbxSkeletalAnim", file: "m12_skeletal_anim.fbx", view: { alpha: -PI / 2, beta: PI / 2 } },
        { fn: "CreateFbxMorphAnim", file: "m13_morph_anim.fbx", view: { alpha: -PI / 3, beta: PI / 3.4 } },
        { fn: "CreateFbxMultiClip", file: "m14_multiclip.fbx", view: { alpha: -PI / 3, beta: PI / 3 } },
        { fn: "CreateFbxCameraLights", file: "m15_camera_lights.fbx", view: { useFbxCamera: true } },
        { fn: "CreateFbxAxisYup", file: "m16_axis_yup.fbx", view: { alpha: -PI / 4, beta: PI / 3 } },
        { fn: "CreateFbxAxisZup", file: "m16_axis_zup.fbx", view: { alpha: -PI / 4, beta: PI / 3 } },
        { fn: "CreateFbxUnits", file: "m16_units_254.fbx", view: { alpha: -PI / 4, beta: PI / 3 } },
    ];

    MODELS.forEach(function (m) {
        window[m.fn] = function (engine) {
            return buildScene(engine, m.file, m.view);
        };
    });
})();
