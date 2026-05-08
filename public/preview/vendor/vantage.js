import * as e from "three";
import { BufferAttribute as t, BufferGeometry as n, DepthTexture as r, DoubleSide as i, Group as a, LineBasicMaterial as o, LineSegments as s, Matrix4 as c, Mesh as l, MeshBasicMaterial as u, MeshDepthMaterial as d, MeshPhysicalMaterial as f, PerspectiveCamera as p, PlaneGeometry as m, Texture as h, TextureLoader as g, Vector3 as _, VideoTexture as v, WebGLRenderTarget as y } from "three";
import { OrbitControls as b } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader as x } from "three/addons/loaders/GLTFLoader.js";
//#region src/lib/scene/CameraRig.ts
var S = new e.Vector3(), C = class extends b {
	flyTarget = null;
	constructor(e, t) {
		super(e, t), this.addEventListener("start", () => {
			this.flyTarget = null;
		});
	}
	focusObject(t) {
		let n = new e.Box3().setFromObject(t);
		if (n.isEmpty()) return;
		let r = n.getCenter(new e.Vector3()), i = n.getSize(new e.Vector3()).length(), a = this.object.position.clone().sub(this.target).normalize();
		this.flyTarget = {
			target: r,
			position: r.clone().add(a.multiplyScalar(i * 1.5))
		};
	}
	flyToProjection(t) {
		let n = t.getWorldPosition(new e.Vector3());
		t.getWorldDirection(S), this.flyTarget = {
			position: n,
			target: n.clone().addScaledVector(S, 10)
		};
	}
	tick() {
		this.flyTarget && (this.object.position.lerp(this.flyTarget.position, .08), this.target.lerp(this.flyTarget.target, .08), this.object.position.distanceTo(this.flyTarget.position) < .1 && (this.object.position.copy(this.flyTarget.position), this.target.copy(this.flyTarget.target), this.flyTarget = null)), this.update();
	}
}, w = class extends e.Mesh {
	constructor() {
		let t = new e.PlaneGeometry(2, 2, 1, 1), n = new e.ShaderMaterial({
			side: e.DoubleSide,
			transparent: !0,
			depthWrite: !1,
			depthTest: !0,
			uniforms: {
				uColor: { value: new e.Color(.45, .45, .45) },
				uDistance: { value: 200 },
				uCamPos: { value: new e.Vector3() }
			},
			vertexShader: "\n        uniform float uDistance;\n\n        varying vec3 vWorldPos;\n\n        void main() {\n          // Orient the XY plane to XZ, scale by uDistance, follow camera\n          vec3 pos = position.xzy * uDistance;\n          pos.xz += cameraPosition.xz;\n\n          vWorldPos = pos;\n          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);\n        }\n      ",
			fragmentShader: "\n        uniform vec3 uColor;\n        uniform float uDistance;\n        uniform vec3 uCamPos;\n\n        varying vec3 vWorldPos;\n\n        float grid(float scale) {\n          vec2 r = vWorldPos.xz / scale;\n\n          // grid lines\n          vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);\n          float line = min(grid.x, grid.y);\n          return 1.0 - min(line, 1.0);\n          \n          // grid cross\n          // // Distance to nearest line in each axis (in pixel units)\n          // vec2 d = abs(fract(r - 0.5) - 0.5);\n          // vec2 fw = fwidth(r);\n          // vec2 grid = d / fw;\n          // // Anti-aliased line presence per axis (1 = on line, 0 = off)\n          // float onLineX = 1.0 - min(grid.x, 1.0);\n          // float onLineY = 1.0 - min(grid.y, 1.0);\n          // // Proximity to perpendicular line (arm length = 05% of cell)\n          // float nearLineY = 1.0 - smoothstep(0.0, 0.05, d.y);\n          // float nearLineX = 1.0 - smoothstep(0.0, 0.05, d.x);\n          // // Cross: X-line arm near Y-intersections + Y-line arm near X-intersections\n          // float crossX = onLineX * nearLineY;\n          // float crossY = onLineY * nearLineX;\n          // return max(crossX, crossY);\n        }\n\n        void main() {\n          // LOD based on camera distance from origin\n          float camDist = max(length(uCamPos), 1.0);\n          float logDist = log2(camDist) / log2(10.0);\n          float level = logDist - 0.5;\n          float levelFloor = floor(level);\n          float levelFract = level - levelFloor;\n\n          float minorA = pow(10.0, levelFloor);\n          float majorA = pow(10.0, levelFloor + 1.0);\n          float minorB = pow(10.0, levelFloor + 1.0);\n          float majorB = pow(10.0, levelFloor + 2.0);\n\n          float gMinorA = grid(minorA);\n          float gMajorA = grid(majorA);\n          float gMinorB = grid(minorB);\n          float gMajorB = grid(majorB);\n\n          float lineA = gMinorA * 0.15 + gMajorA * 0.4;\n          float lineB = gMinorB * 0.15 + gMajorB * 0.4;\n          float line = mix(lineA, lineB, levelFract);\n\n          // Distance-adaptive fade\n          float fadeRadius = camDist * 6.0;\n          float dist = distance(cameraPosition.xz, vWorldPos.xz);\n          float fade = 1.0 - smoothstep(fadeRadius * 0.4, fadeRadius, dist);\n\n          float alpha = line * fade;\n          if (alpha < 0.001) discard;\n\n          gl_FragColor = vec4(uColor, alpha);\n        }\n      ",
			extensions: { derivatives: !0 }
		});
		super(t, n), this.frustumCulled = !1, this.renderOrder = -1;
	}
	update(e) {
		let t = this.material, n = e.position;
		t.uniforms.uCamPos.value.copy(n);
		let r = Math.max(n.length(), 1);
		t.uniforms.uDistance.value = Math.max(r * 8, 200);
	}
}, T = class extends e.Group {
	grid;
	constructor() {
		super(), this.grid = new w(), this.add(this.grid), this.add(new e.AmbientLight(16777215, .8));
		let t = new e.DirectionalLight(16777215, 3), n = new e.DirectionalLight(16777215, 3);
		t.position.set(1, 1, 1), n.position.set(-1, -1, -1), this.add(t, n);
	}
}, E = 1;
//#endregion
//#region src/lib/scene/projection/shader-utils.ts
function D(e, { defines: t = "", header: n = "", main: r = "", ...i }) {
	let a = e;
	for (let [e, t] of Object.entries(i)) t !== void 0 && (a = a.split(e).join(t));
	return a = a.replace("void main() {", `
    ${n}
    void main() {
      ${r}
    `), `
    ${t}
    ${a}
  `;
}
function O(e, t) {
	function n() {
		if (!e.image) return !1;
		let t = e.image;
		if (!("videoWidth" in t)) return !0;
		let n = t;
		return n.videoWidth > 0 && n.videoHeight > 0;
	}
	if (n()) return;
	let r = setInterval(() => {
		n() && (clearInterval(r), t(e));
	}, 16);
}
function ee(e, t) {
	if (!e.image) return [1, 1];
	let n = e.image;
	if ("videoWidth" in n) {
		let e = n;
		if (e.videoWidth === 0 && e.videoHeight === 0) return [1, 1];
	}
	let r = (n.naturalWidth ?? n.videoWidth ?? n.width) / (n.naturalHeight ?? n.videoHeight ?? n.height), i = t.aspect;
	return r < i ? [i / r, 1] : [1, r / i];
}
//#endregion
//#region src/lib/scene/projection/shader-chunks.ts
var k = "\n  uniform mat4 viewMatrixCamera;\n  uniform mat4 projectionMatrixCamera;\n  uniform mat4 savedModelMatrix;\n\n  varying vec3 vSavedNormal;\n  varying vec4 vTexCoords;\n  varying vec4 vWorldPosition;\n", A = "\n  vSavedNormal = mat3(savedModelMatrix) * normal;\n  vTexCoords = projectionMatrixCamera * viewMatrixCamera * savedModelMatrix * vec4(position, 1.0);\n  vWorldPosition = savedModelMatrix * vec4(position, 1.0);\n", j = "\n  uniform sampler2D projectedTexture;\n  uniform sampler2D depthMap;\n  uniform bool isTextureLoaded;\n  uniform bool isTextureProjected;\n  uniform vec3 projPosition;\n  uniform vec3 projDirection;\n  uniform float widthScaled;\n  uniform float heightScaled;\n  uniform mat4 projectionMatrixCamera;\n\n  varying vec3 vSavedNormal;\n  varying vec4 vTexCoords;\n  varying vec4 vWorldPosition;\n\n  float mapRange(float value, float min1, float max1, float min2, float max2) {\n    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);\n  }\n", M = "\n  // clamp the w to make sure we don't project behind\n  float w = max(vTexCoords.w, 0.0);\n\n  vec2 uv = (vTexCoords.xy / w) * 0.5 + 0.5;\n  #ifdef STOP_PROPAGATION\n  vec2 uvDepthMap = uv;\n  #endif\n\n  // apply the corrected width and height\n  uv.x = mapRange(uv.x, 0.0, 1.0, 0.5 - widthScaled / 2.0, 0.5 + widthScaled / 2.0);\n  uv.y = mapRange(uv.y, 0.0, 1.0, 0.5 - heightScaled / 2.0, 0.5 + heightScaled / 2.0);\n\n  // this makes sure we don't sample out of the texture\n  bool isInTexture = (max(uv.x, uv.y) <= 1.0 && min(uv.x, uv.y) >= 0.0);\n\n  // this makes sure we don't render also the back of the object\n  vec3 projectorDirection = normalize(projPosition - vWorldPosition.xyz);\n  float dotProduct = dot(vSavedNormal, projectorDirection);\n\n  bool isFacingProjector = dotProduct > 0.0000001;\n\n  bool isInShadow = false;\n  #ifdef STOP_PROPAGATION\n    vec4 depthMapColor = texture2D(depthMap, uvDepthMap);\n\n    float depth = depthMapColor.x;\n\n    float z_ndc = 2.0 * depth - 1.0;\n\n    float a = projectionMatrixCamera[2][2];\n    float b = projectionMatrixCamera[3][2];\n    float z_eye = b / (a + z_ndc);\n\n    isInShadow = vTexCoords.w > z_eye + 0.1 || depth == 1.0;\n  #endif\n\n  vec4 diffuseColor = vec4(diffuse, 0);\n\n  if (isFacingProjector && isInTexture && isTextureLoaded && isTextureProjected && !isInShadow) {\n    vec4 textureColor = texture2D(projectedTexture, uv);\n    // apply the material opacity\n    textureColor.a *= opacity;\n\n    // https://learnopengl.com/Advanced-OpenGL/Blending\n    diffuseColor = textureColor * textureColor.a + diffuseColor * (1.0 - textureColor.a);\n  }\n", N = class extends f {
	#e;
	get camera() {
		return this.#e;
	}
	set camera(e) {
		if (!e?.isCamera) throw Error("Invalid camera set to the ProjectionMaterial");
		this.#e = e, this.#n();
	}
	get texture() {
		return this.uniforms.projectedTexture.value;
	}
	set texture(e) {
		if (!e?.isTexture) throw Error("Invalid texture set to the ProjectionMaterial");
		this.uniforms.projectedTexture.value = e, this.uniforms.isTextureLoaded.value = !!e.image, this.uniforms.isTextureLoaded.value ? this.#n() : O(e, () => {
			this.uniforms.isTextureLoaded.value = !0, this.dispatchEvent({ type: "textureload" }), this.#n();
		});
	}
	get depthMap() {
		return this.uniforms.depthMap.value;
	}
	set depthMap(e) {
		if (e !== null && !e?.isTexture) throw Error("Invalid texture set to the ProjectionMaterial");
		this.uniforms.depthMap.value = e;
	}
	constructor({ camera: e = new p(), texture: t = new h(), depthMap: n = null, ...r } = {}) {
		super(r), Object.defineProperty(this, "isProjectionMaterial", { value: !0 }), this.#e = e, this.uniforms = {
			projectedTexture: { value: null },
			isTextureLoaded: { value: !1 },
			isTextureProjected: { value: !1 },
			viewMatrixCamera: { value: new c() },
			projectionMatrixCamera: { value: new c() },
			projPosition: { value: new _() },
			projDirection: { value: new _(0, 0, -1) },
			savedModelMatrix: { value: new c() },
			widthScaled: { value: 1 },
			heightScaled: { value: 1 },
			depthMap: { value: n }
		}, this.onBeforeCompile = (e) => {
			if (Object.assign(this.uniforms, e.uniforms), e.uniforms = this.uniforms, n) {
				let t = e.defines ??= {};
				t.STOP_PROPAGATION = "";
			}
			e.vertexShader = D(e.vertexShader, {
				header: k,
				main: A
			}), e.fragmentShader = D(e.fragmentShader, {
				header: j,
				"vec4 diffuseColor = vec4( diffuse, opacity );": M
			});
		}, window.addEventListener("resize", this.#t), this.texture = t;
	}
	#t = () => {
		this.uniforms.projectionMatrixCamera.value.copy(this.camera.projectionMatrix), this.#n();
	};
	#n() {
		let [e, t] = ee(this.texture, this.camera);
		this.uniforms.widthScaled.value = e, this.uniforms.heightScaled.value = t;
	}
	#r() {
		this.camera.updateProjectionMatrix(), this.camera.updateMatrixWorld(), this.camera.updateWorldMatrix(!1, !1), this.uniforms.viewMatrixCamera.value.copy(this.camera.matrixWorldInverse), this.uniforms.projectionMatrixCamera.value.copy(this.camera.projectionMatrix), this.uniforms.projPosition.value.setFromMatrixPosition(this.camera.matrixWorld), this.uniforms.projDirection.value.set(0, 0, 1).transformDirection(this.camera.matrixWorld), this.uniforms.isTextureProjected.value = !0;
	}
	project(e) {
		let t = Array.isArray(e.material) ? e.material : [e.material];
		if (!t.some((e) => e.isProjectionMaterial)) throw Error("The mesh material must be a ProjectionMaterial");
		if (!t.some((e) => e === this)) throw Error("The provided mesh doesn't include this material where project() has been called from");
		e.updateWorldMatrix(!0, !1), this.uniforms.savedModelMatrix.value.copy(e.matrixWorld), this.#r();
	}
	copy(e) {
		return super.copy(e), this.camera = e.camera, this.texture = e.texture, this.depthMap = e.depthMap, this;
	}
	dispose() {
		super.dispose(), window.removeEventListener("resize", this.#t);
	}
}, P = class extends p {
	isVantageProjection = !0;
	renderTarget;
	texture = null;
	projectionPlane = null;
	_targets = /* @__PURE__ */ new Set();
	_materials = /* @__PURE__ */ new Map();
	_depthMaterial = new d({
		polygonOffset: !0,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1
	});
	constructor({ texture: e, fov: t = 60, near: n = 5, far: i = 1e3, renderTargetSize: a = 1024 } = {}) {
		super(t, 1, n, i), this.renderTarget = new y(a, a), this.renderTarget.depthTexture = new r(a, a), this._initProjectionPlane();
		let o = !0;
		Object.defineProperty(this, "visible", {
			get: () => o,
			set: (e) => {
				if (e !== o) if (o = e, e) for (let e of this._targets) this._applyToTarget(e);
				else for (let e of this._targets) this._removeFromTarget(e);
			},
			enumerable: !0,
			configurable: !0
		}), e && this.setTexture(e);
	}
	updateProjectionMatrix() {
		super.updateProjectionMatrix(), this._updateProjectionPlaneSize();
	}
	setTexture(e) {
		this.texture = e;
		let t = e.image;
		this.aspect = (t?.videoWidth ?? t?.width ?? 1) / (t?.videoHeight ?? t?.height ?? 1), this.updateProjectionMatrix(), this.projectionPlane && (this.projectionPlane.material.map = e, this.projectionPlane.material.needsUpdate = !0);
	}
	project(e) {
		this._targets.add(e), this.visible && this._applyToTarget(e);
	}
	unproject(e) {
		this._targets.delete(e), this._removeFromTarget(e);
	}
	reapply() {
		for (let e of this._targets) this._removeFromTarget(e);
		if (this.visible) for (let e of this._targets) this._applyToTarget(e);
	}
	_applyToTarget(e) {
		e.traverse((e) => {
			e.isMesh && this._applyMaterial(e);
		});
	}
	_removeFromTarget(e) {
		e.traverse((e) => {
			if (!e.isMesh) return;
			let t = e, n = this._materials.get(t);
			if (!n) return;
			let { mat: r, hadGroups: i } = n, a = t.material, o = a.indexOf(r);
			o !== -1 && (t.geometry.groups = t.geometry.groups.filter((e) => e.materialIndex !== o), !i && a.length === 2 && (t.geometry.groups = t.geometry.groups.filter((e) => e.materialIndex !== 0)), t.geometry.groups.forEach((e) => {
				e.materialIndex > o && e.materialIndex--;
			}), a.splice(o, 1), a.length === 1 && (t.material = a[0])), this._materials.delete(t), r.dispose();
		});
	}
	update(e, t) {
		if (!(!this.texture || this._materials.size === 0)) {
			this._createDepthMap(e, t);
			for (let [e, { mat: t }] of this._materials) t.project(e);
		}
	}
	dispose() {
		this.renderTarget.depthTexture?.dispose(), this.renderTarget.dispose();
		for (let { mat: e } of this._materials.values()) e.dispose();
		this._materials.clear(), this.projectionPlane && (this.projectionPlane.geometry.dispose(), this.projectionPlane.material.dispose());
	}
	_initProjectionPlane() {
		let e = new u({
			map: null,
			transparent: !0
		});
		this.projectionPlane = new l(new m(1, 1), e), this.projectionPlane.visible = !0, this.projectionPlane.renderOrder = -1, this.projectionPlane.layers.set(1), this.add(this.projectionPlane), this._updateProjectionPlaneSize();
	}
	_updateProjectionPlaneSize() {
		if (!this.projectionPlane) return;
		let e = this.fov * Math.PI / 180 / 2, t = 2 * this.far * Math.tan(e), n = t * this.aspect;
		this.projectionPlane.scale.set(n, t, 1), this.projectionPlane.position.set(0, 0, -this.far);
	}
	_applyMaterial(e) {
		if (this._materials.has(e) || !this.texture) return;
		let t = e.geometry.groups.length > 0;
		if (!Array.isArray(e.material)) {
			e.material = [e.material];
			for (let t of e.geometry.groups) t.materialIndex = 0;
		}
		t || e.geometry.addGroup(0, Infinity, 0);
		let n = e.material.length;
		e.geometry.addGroup(0, Infinity, n);
		let r = new N({
			camera: this,
			texture: this.texture,
			transparent: !0,
			opacity: 1,
			depthMap: this.renderTarget.depthTexture
		});
		e.material.push(r), r.project(e), this._materials.set(e, {
			mat: r,
			hadGroups: t
		});
	}
	_createDepthMap(e, t) {
		t.overrideMaterial = this._depthMaterial, e.setRenderTarget(this.renderTarget), e.render(t, this), e.setRenderTarget(null), t.overrideMaterial = null;
	}
};
//#endregion
//#region src/lib/scene/themeColors.ts
function te(t) {
	let n = document.createElement("div");
	document.body.appendChild(n), n.style.color = `var(${t})`;
	let r = getComputedStyle(n).color;
	return document.body.removeChild(n), new e.Color(r);
}
var F = {
	brand: new e.Color("#01ff00"),
	axisX: new e.Color("#ff7704"),
	axisY: new e.Color("#41b8ff"),
	axisZ: new e.Color("#01ff00")
}, I = {
	get axisX() {
		return te("--color-vantage-axis-x");
	},
	get axisY() {
		return te("--color-vantage-axis-y");
	},
	get axisZ() {
		return te("--color-vantage-axis-z");
	},
	get brand() {
		return te("--color-vantage-brand");
	}
}, L = 32, R = 24, z = class extends a {
	cam;
	lines;
	frustumMesh;
	_p = new _();
	_n = Array.from({ length: 4 }, () => new _());
	_f = Array.from({ length: 4 }, () => new _());
	constructor(e) {
		super(), this.cam = e;
		let r = I.brand, a = new n();
		a.setAttribute("position", new t(new Float32Array(L * 3), 3)), this.lines = new s(a, new o({ color: r })), this.lines.frustumCulled = !1, this.lines.layers.set(1), this.add(this.lines);
		let c = new n();
		c.setAttribute("position", new t(new Float32Array(R * 3), 3)), this.frustumMesh = new l(c, new u({
			color: r,
			side: i,
			transparent: !0,
			opacity: .025,
			depthWrite: !1
		})), this.frustumMesh.frustumCulled = !1, this.frustumMesh.layers.set(1), this.add(this.frustumMesh), this.update();
	}
	update() {
		let { cam: e, _p: t, _n: n, _f: r } = this, i = I.brand;
		this.lines.material.color.copy(i), this.frustumMesh.material.color.copy(i), e.updateWorldMatrix(!0, !1), e.getWorldPosition(t), n[0].set(-1, -1, -1).unproject(e), n[1].set(1, -1, -1).unproject(e), n[2].set(-1, 1, -1).unproject(e), n[3].set(1, 1, -1).unproject(e), r[0].set(-1, -1, 1).unproject(e), r[1].set(1, -1, 1).unproject(e), r[2].set(-1, 1, 1).unproject(e), r[3].set(1, 1, 1).unproject(e);
		let a = this.lines.geometry.getAttribute("position"), o = 0;
		B(a, o, t, n[0]), o += 2, B(a, o, t, n[1]), o += 2, B(a, o, t, n[2]), o += 2, B(a, o, t, n[3]), o += 2, B(a, o, n[0], n[1]), o += 2, B(a, o, n[1], n[3]), o += 2, B(a, o, n[3], n[2]), o += 2, B(a, o, n[2], n[0]), o += 2, B(a, o, r[0], r[1]), o += 2, B(a, o, r[1], r[3]), o += 2, B(a, o, r[3], r[2]), o += 2, B(a, o, r[2], r[0]), o += 2, B(a, o, n[0], r[0]), o += 2, B(a, o, n[1], r[1]), o += 2, B(a, o, n[2], r[2]), o += 2, B(a, o, n[3], r[3]), a.needsUpdate = !0;
		let s = this.frustumMesh.geometry.getAttribute("position"), c = 0;
		return V(s, c, n[0], r[0], r[1]), c += 3, V(s, c, n[0], r[1], n[1]), c += 3, V(s, c, n[1], r[1], r[3]), c += 3, V(s, c, n[1], r[3], n[3]), c += 3, V(s, c, n[3], r[3], r[2]), c += 3, V(s, c, n[3], r[2], n[2]), c += 3, V(s, c, n[2], r[2], r[0]), c += 3, V(s, c, n[2], r[0], n[0]), s.needsUpdate = !0, this;
	}
	dispose() {
		this.lines.geometry.dispose(), this.lines.material.dispose(), this.frustumMesh.geometry.dispose(), this.frustumMesh.material.dispose();
	}
};
function B(e, t, n, r) {
	e.setXYZ(t, n.x, n.y, n.z), e.setXYZ(t + 1, r.x, r.y, r.z);
}
function V(e, t, n, r, i) {
	e.setXYZ(t, n.x, n.y, n.z), e.setXYZ(t + 1, r.x, r.y, r.z), e.setXYZ(t + 2, i.x, i.y, i.z);
}
//#endregion
//#region src/lib/scene/projection/loadTexture.ts
async function ne(e) {
	return /\.(mp4|webm|ogg)$/i.test(e) ? new v(await new Promise((t) => {
		let n = document.createElement("video");
		n.src = e, n.crossOrigin = "anonymous", n.playsInline = !0, n.muted = !0, n.loop = !1, n.play(), n.addEventListener("playing", () => {
			n.pause(), t(n);
		}, { once: !0 });
	})) : new Promise((t, n) => {
		new g().load(e, t, void 0, n);
	});
}
//#endregion
//#region src/lib/constants.ts
var H = {
	fov: 60,
	near: .1,
	far: 1e5,
	position: [
		18,
		14,
		18
	]
}, re = {
	MODEL: /\.(gltf|glb)$/i,
	IMAGE: /\.(jpe?g|png|webp)$/i
}, ie = ["models", "projections"], ae = new x();
async function oe(e) {
	let t = URL.createObjectURL(e);
	try {
		return {
			group: (await ae.loadAsync(t)).scene,
			blob: e
		};
	} finally {
		URL.revokeObjectURL(t);
	}
}
//#endregion
//#region src/lib/project/serializer.ts
function se(e, t, n, r) {
	let i = {
		version: 1,
		objects: e.map((e) => {
			let t = e.object, n;
			return n = e.source.kind === "primitive" ? {
				kind: "primitive",
				geometryType: e.source.geometryType
			} : {
				kind: "imported",
				path: e.source.relativePath
			}, {
				id: e.id,
				name: e.name,
				type: "mesh",
				source: n,
				transform: {
					position: [
						t.position.x,
						t.position.y,
						t.position.z
					],
					rotation: [
						t.rotation.x,
						t.rotation.y,
						t.rotation.z
					],
					scale: [
						t.scale.x,
						t.scale.y,
						t.scale.z
					]
				},
				visible: e.visible
			};
		}),
		showGrid: r?.showGrid,
		clearColor: r?.clearColor
	};
	return t && (i.camera = {
		position: [
			t.position.x,
			t.position.y,
			t.position.z
		],
		target: [
			t.target.x,
			t.target.y,
			t.target.z
		],
		fov: t.fov
	}), n && n.length > 0 && (i.projections = n.map((e) => {
		let t = e.projection;
		return {
			id: e.id,
			name: e.name,
			imagePath: e.imagePath,
			transform: {
				position: [
					t.position.x,
					t.position.y,
					t.position.z
				],
				rotation: [
					t.rotation.x,
					t.rotation.y,
					t.rotation.z
				]
			},
			fov: t.fov,
			near: t.near,
			far: t.far,
			visible: e.visible
		};
	})), i;
}
async function ce(t, n) {
	let r = [];
	for (let i of t.objects) {
		let t, a;
		if (i.source.kind === "primitive") t = new e.Mesh(new e.BoxGeometry(10, 10, 10), new e.MeshStandardMaterial({ color: 8947848 })), a = {
			kind: "primitive",
			geometryType: i.source.geometryType
		};
		else {
			let { group: e } = await oe(await n(i.source.path));
			t = e, a = {
				kind: "imported",
				relativePath: i.source.path
			};
		}
		t.position.set(...i.transform.position), t.rotation.set(...i.transform.rotation), t.scale.set(...i.transform.scale), t.visible = i.visible, r.push({
			id: i.id,
			name: i.name,
			object: t,
			source: a,
			visible: i.visible
		});
	}
	return r;
}
async function le(e, t) {
	let n = [];
	for (let r of e) {
		let e = await t(r.imagePath), i = URL.createObjectURL(e);
		try {
			let e = new P({
				texture: await ne(i),
				fov: r.fov,
				near: r.near,
				far: r.far
			});
			e.position.set(...r.transform.position), e.rotation.set(...r.transform.rotation), n.push({
				id: r.id,
				name: r.name,
				projection: e,
				visible: r.visible,
				imagePath: r.imagePath
			});
		} finally {
			URL.revokeObjectURL(i);
		}
	}
	return n;
}
//#endregion
//#region src/lib/project/validateManifest.ts
var U = class extends Error {
	constructor(e) {
		super(e), this.name = "ManifestValidationError";
	}
};
function W(e, t, n) {
	if (typeof e !== t) throw new U(`Expected ${n} to be ${t}, got ${typeof e}`);
}
function ue(e, t) {
	if (!Array.isArray(e)) throw new U(`Expected ${t} to be an array, got ${typeof e}`);
}
function de(e, t) {
	if (ue(e, t), e.length !== 3 || !e.every((e) => typeof e == "number")) throw new U(`Expected ${t} to be [number, number, number]`);
}
function fe(e, t, n) {
	if (!e || typeof e != "object") throw new U(`Expected ${t} to be an object`);
	let r = e;
	de(r.position, `${t}.position`), de(r.rotation, `${t}.rotation`), n && de(r.scale, `${t}.scale`);
}
function pe(e, t) {
	let n = `objects[${t}]`;
	if (!e || typeof e != "object") throw new U(`Expected ${n} to be an object`);
	let r = e;
	if (W(r.id, "string", `${n}.id`), W(r.name, "string", `${n}.name`), W(r.visible, "boolean", `${n}.visible`), !r.source || typeof r.source != "object") throw new U(`Expected ${n}.source to be an object`);
	let i = r.source;
	if (i.kind !== "primitive" && i.kind !== "imported") throw new U(`Expected ${n}.source.kind to be 'primitive' or 'imported', got '${i.kind}'`);
	fe(r.transform, `${n}.transform`, !0);
}
function me(e, t) {
	let n = `projections[${t}]`;
	if (!e || typeof e != "object") throw new U(`Expected ${n} to be an object`);
	let r = e;
	W(r.id, "string", `${n}.id`), W(r.name, "string", `${n}.name`), W(r.imagePath, "string", `${n}.imagePath`), W(r.fov, "number", `${n}.fov`), W(r.near, "number", `${n}.near`), W(r.far, "number", `${n}.far`), W(r.visible, "boolean", `${n}.visible`), fe(r.transform, `${n}.transform`, !1);
}
function he(e) {
	if (!e || typeof e != "object") throw new U("Manifest must be a JSON object");
	let t = e;
	if (t.version !== 1) throw new U(`Unsupported manifest version: ${t.version} (expected 1)`);
	ue(t.objects, "objects");
	for (let e = 0; e < t.objects.length; e++) pe(t.objects[e], e);
	if (t.projections !== void 0) {
		ue(t.projections, "projections");
		for (let e = 0; e < t.projections.length; e++) me(t.projections[e], e);
	}
	if (t.camera !== void 0) {
		if (!t.camera || typeof t.camera != "object") throw new U("Expected camera to be an object");
		let e = t.camera;
		de(e.position, "camera.position"), de(e.target, "camera.target"), W(e.fov, "number", "camera.fov");
	}
	return e;
}
//#endregion
//#region src/lib/scene/SceneViewer.ts
var ge = class {
	renderer;
	scene;
	camera;
	rig;
	env;
	clock = new e.Timer();
	projections = [];
	ro;
	animId = 0;
	constructor(t) {
		this.renderer = new e.WebGLRenderer({
			canvas: t,
			antialias: !1
		}), this.renderer.setPixelRatio(window.devicePixelRatio), this.renderer.setSize(t.clientWidth, t.clientHeight, !1), this.renderer.setClearColor(15984637), this.scene = new e.Scene(), this.camera = new e.PerspectiveCamera(H.fov, t.clientWidth / t.clientHeight, H.near, H.far), this.camera.position.set(...H.position), this.camera.lookAt(0, 0, 0), this.camera.layers.enable(1), this.rig = new C(this.camera, t), this.rig.enableDamping = !0, this.env = new T(), this.scene.add(this.env), this.ro = new ResizeObserver(() => {
			this.renderer.setSize(t.clientWidth, t.clientHeight, !1), this.camera.aspect = t.clientWidth / t.clientHeight, this.camera.updateProjectionMatrix();
		}), this.ro.observe(t), requestAnimationFrame(() => this.animate());
	}
	loadScene(e, t, n = {}) {
		for (let e of this.projections) e.projection.unproject(this.scene), e.projection.dispose(), this.scene.remove(e.projection);
		let r = this.scene.children.filter((e) => e !== this.env);
		for (let e of r) this.scene.remove(e);
		this.projections = t;
		for (let { object: t, visible: n } of e) t.visible = n, this.scene.add(t);
		for (let { projection: n, visible: r } of t) {
			n.visible = r, this.scene.add(n);
			for (let { object: t } of e) n.project(t);
		}
		this.env.grid.visible = n.showGrid ?? !0, n.clearColor && this.renderer.setClearColor(n.clearColor);
	}
	getCameraState() {
		return {
			position: [
				this.camera.position.x,
				this.camera.position.y,
				this.camera.position.z
			],
			target: [
				this.rig.target.x,
				this.rig.target.y,
				this.rig.target.z
			],
			fov: this.camera.fov
		};
	}
	setCameraState(e) {
		this.camera.position.set(...e.position), this.rig.target.set(...e.target), this.camera.fov = e.fov, this.camera.updateProjectionMatrix(), this.rig.update();
	}
	beginPlayback() {
		this.rig.enabled = !1;
	}
	endPlayback() {
		this.rig.enabled = !0;
	}
	applyAnimatedCamera(e) {
		this.camera.position.set(...e.position), this.rig.target.set(...e.target), this.camera.fov = e.fov, this.camera.updateProjectionMatrix(), this.rig.update();
	}
	async openProject(e) {
		let t = await e("scene.json"), n = he(JSON.parse(await t.text())), r = await ce(n, e), i = n.projections ? await le(n.projections, e) : [];
		return this.loadScene(r.map((e) => ({
			object: e.object,
			visible: e.visible
		})), i.map((e) => ({
			projection: e.projection,
			visible: e.visible
		})), {
			showGrid: n.showGrid,
			clearColor: n.clearColor
		}), n.camera && this.setCameraState(n.camera), n;
	}
	dispose() {
		this.onDispose(), cancelAnimationFrame(this.animId), this.ro.disconnect();
		for (let { projection: e } of this.projections) e.dispose();
		this.renderer.dispose();
	}
	animate() {
		this.animId = requestAnimationFrame(() => this.animate()), this.clock.update();
		let e = this.clock.getDelta() * 1e3;
		this.tickCamera(e), this.onTick(), this.updateProjections(), this.updateEnvironment(), this.renderer.render(this.scene, this.camera);
	}
	tickCamera(e) {
		this.rig.tick();
	}
	onTick() {}
	updateProjections() {
		for (let { projection: e, visible: t } of this.projections) t && e.update(this.renderer, this.scene);
	}
	updateEnvironment() {
		this.env.grid.visible && this.env.grid.update(this.camera);
	}
	onDispose() {}
};
//#endregion
//#region src/lib/project/fileSystem.ts
function _e() {
	return "showDirectoryPicker" in window;
}
function ve(e) {
	async function t(t, n) {
		let r = t.split("/").filter(Boolean), i = e;
		for (let e of r) i = await i.getDirectoryHandle(e, { create: n });
		return i;
	}
	return {
		async readFile(n) {
			let r = n.split("/"), i = r.pop(), a = r.join("/");
			return (await (a ? await t(a, !1) : e).getFileHandle(i)).getFile();
		},
		async writeFile(n, r) {
			let i = n.split("/"), a = i.pop(), o = i.join("/"), s = await (await (o ? await t(o, !0) : e).getFileHandle(a, { create: !0 })).createWritable();
			await s.write(r), await s.close();
		},
		async mkdir(e) {
			await t(e, !0);
		}
	};
}
//#endregion
//#region node_modules/fflate/esm/browser.js
var G = Uint8Array, K = Uint16Array, ye = Int32Array, be = new G([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]), xe = new G([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]), Se = new G([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]), Ce = function(e, t) {
	for (var n = new K(31), r = 0; r < 31; ++r) n[r] = t += 1 << e[r - 1];
	for (var i = new ye(n[30]), r = 1; r < 30; ++r) for (var a = n[r]; a < n[r + 1]; ++a) i[a] = a - n[r] << 5 | r;
	return {
		b: n,
		r: i
	};
}, we = Ce(be, 2), Te = we.b, Ee = we.r;
Te[28] = 258, Ee[258] = 28;
for (var De = Ce(xe, 0), Oe = De.b, ke = De.r, Ae = new K(32768), q = 0; q < 32768; ++q) {
	var je = (q & 43690) >> 1 | (q & 21845) << 1;
	je = (je & 52428) >> 2 | (je & 13107) << 2, je = (je & 61680) >> 4 | (je & 3855) << 4, Ae[q] = ((je & 65280) >> 8 | (je & 255) << 8) >> 1;
}
for (var J = (function(e, t, n) {
	for (var r = e.length, i = 0, a = new K(t); i < r; ++i) e[i] && ++a[e[i] - 1];
	var o = new K(t);
	for (i = 1; i < t; ++i) o[i] = o[i - 1] + a[i - 1] << 1;
	var s;
	if (n) {
		s = new K(1 << t);
		var c = 15 - t;
		for (i = 0; i < r; ++i) if (e[i]) for (var l = i << 4 | e[i], u = t - e[i], d = o[e[i] - 1]++ << u, f = d | (1 << u) - 1; d <= f; ++d) s[Ae[d] >> c] = l;
	} else for (s = new K(r), i = 0; i < r; ++i) e[i] && (s[i] = Ae[o[e[i] - 1]++] >> 15 - e[i]);
	return s;
}), Me = new G(288), q = 0; q < 144; ++q) Me[q] = 8;
for (var q = 144; q < 256; ++q) Me[q] = 9;
for (var q = 256; q < 280; ++q) Me[q] = 7;
for (var q = 280; q < 288; ++q) Me[q] = 8;
for (var Ne = new G(32), q = 0; q < 32; ++q) Ne[q] = 5;
var Pe = /* @__PURE__ */ J(Me, 9, 0), Fe = /* @__PURE__ */ J(Me, 9, 1), Ie = /* @__PURE__ */ J(Ne, 5, 0), Le = /* @__PURE__ */ J(Ne, 5, 1), Re = function(e) {
	for (var t = e[0], n = 1; n < e.length; ++n) e[n] > t && (t = e[n]);
	return t;
}, Y = function(e, t, n) {
	var r = t / 8 | 0;
	return (e[r] | e[r + 1] << 8) >> (t & 7) & n;
}, ze = function(e, t) {
	var n = t / 8 | 0;
	return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (t & 7);
}, Be = function(e) {
	return (e + 7) / 8 | 0;
}, Ve = function(e, t, n) {
	return (t == null || t < 0) && (t = 0), (n == null || n > e.length) && (n = e.length), new G(e.subarray(t, n));
}, He = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
], X = function(e, t, n) {
	var r = Error(t || He[e]);
	if (r.code = e, Error.captureStackTrace && Error.captureStackTrace(r, X), !n) throw r;
	return r;
}, Ue = function(e, t, n, r) {
	var i = e.length, a = r ? r.length : 0;
	if (!i || t.f && !t.l) return n || new G(0);
	var o = !n, s = o || t.i != 2, c = t.i;
	o && (n = new G(i * 3));
	var l = function(e) {
		var t = n.length;
		if (e > t) {
			var r = new G(Math.max(t * 2, e));
			r.set(n), n = r;
		}
	}, u = t.f || 0, d = t.p || 0, f = t.b || 0, p = t.l, m = t.d, h = t.m, g = t.n, _ = i * 8;
	do {
		if (!p) {
			u = Y(e, d, 1);
			var v = Y(e, d + 1, 3);
			if (d += 3, !v) {
				var y = Be(d) + 4, b = e[y - 4] | e[y - 3] << 8, x = y + b;
				if (x > i) {
					c && X(0);
					break;
				}
				s && l(f + b), n.set(e.subarray(y, x), f), t.b = f += b, t.p = d = x * 8, t.f = u;
				continue;
			} else if (v == 1) p = Fe, m = Le, h = 9, g = 5;
			else if (v == 2) {
				var S = Y(e, d, 31) + 257, C = Y(e, d + 10, 15) + 4, w = S + Y(e, d + 5, 31) + 1;
				d += 14;
				for (var T = new G(w), E = new G(19), D = 0; D < C; ++D) E[Se[D]] = Y(e, d + D * 3, 7);
				d += C * 3;
				for (var O = Re(E), ee = (1 << O) - 1, k = J(E, O, 1), D = 0; D < w;) {
					var A = k[Y(e, d, ee)];
					d += A & 15;
					var y = A >> 4;
					if (y < 16) T[D++] = y;
					else {
						var j = 0, M = 0;
						for (y == 16 ? (M = 3 + Y(e, d, 3), d += 2, j = T[D - 1]) : y == 17 ? (M = 3 + Y(e, d, 7), d += 3) : y == 18 && (M = 11 + Y(e, d, 127), d += 7); M--;) T[D++] = j;
					}
				}
				var N = T.subarray(0, S), P = T.subarray(S);
				h = Re(N), g = Re(P), p = J(N, h, 1), m = J(P, g, 1);
			} else X(1);
			if (d > _) {
				c && X(0);
				break;
			}
		}
		s && l(f + 131072);
		for (var te = (1 << h) - 1, F = (1 << g) - 1, I = d;; I = d) {
			var j = p[ze(e, d) & te], L = j >> 4;
			if (d += j & 15, d > _) {
				c && X(0);
				break;
			}
			if (j || X(2), L < 256) n[f++] = L;
			else if (L == 256) {
				I = d, p = null;
				break;
			} else {
				var R = L - 254;
				if (L > 264) {
					var D = L - 257, z = be[D];
					R = Y(e, d, (1 << z) - 1) + Te[D], d += z;
				}
				var B = m[ze(e, d) & F], V = B >> 4;
				B || X(3), d += B & 15;
				var P = Oe[V];
				if (V > 3) {
					var z = xe[V];
					P += ze(e, d) & (1 << z) - 1, d += z;
				}
				if (d > _) {
					c && X(0);
					break;
				}
				s && l(f + 131072);
				var ne = f + R;
				if (f < P) {
					var H = a - P, re = Math.min(P, ne);
					for (H + f < 0 && X(3); f < re; ++f) n[f] = r[H + f];
				}
				for (; f < ne; ++f) n[f] = n[f - P];
			}
		}
		t.l = p, t.p = I, t.b = f, t.f = u, p && (u = 1, t.m = h, t.d = m, t.n = g);
	} while (!u);
	return f != n.length && o ? Ve(n, 0, f) : n.subarray(0, f);
}, We = function(e, t, n) {
	n <<= t & 7;
	var r = t / 8 | 0;
	e[r] |= n, e[r + 1] |= n >> 8;
}, Ge = function(e, t, n) {
	n <<= t & 7;
	var r = t / 8 | 0;
	e[r] |= n, e[r + 1] |= n >> 8, e[r + 2] |= n >> 16;
}, Ke = function(e, t) {
	for (var n = [], r = 0; r < e.length; ++r) e[r] && n.push({
		s: r,
		f: e[r]
	});
	var i = n.length, a = n.slice();
	if (!i) return {
		t: $e,
		l: 0
	};
	if (i == 1) {
		var o = new G(n[0].s + 1);
		return o[n[0].s] = 1, {
			t: o,
			l: 1
		};
	}
	n.sort(function(e, t) {
		return e.f - t.f;
	}), n.push({
		s: -1,
		f: 25001
	});
	var s = n[0], c = n[1], l = 0, u = 1, d = 2;
	for (n[0] = {
		s: -1,
		f: s.f + c.f,
		l: s,
		r: c
	}; u != i - 1;) s = n[n[l].f < n[d].f ? l++ : d++], c = n[l != u && n[l].f < n[d].f ? l++ : d++], n[u++] = {
		s: -1,
		f: s.f + c.f,
		l: s,
		r: c
	};
	for (var f = a[0].s, r = 1; r < i; ++r) a[r].s > f && (f = a[r].s);
	var p = new K(f + 1), m = qe(n[u - 1], p, 0);
	if (m > t) {
		var r = 0, h = 0, g = m - t, _ = 1 << g;
		for (a.sort(function(e, t) {
			return p[t.s] - p[e.s] || e.f - t.f;
		}); r < i; ++r) {
			var v = a[r].s;
			if (p[v] > t) h += _ - (1 << m - p[v]), p[v] = t;
			else break;
		}
		for (h >>= g; h > 0;) {
			var y = a[r].s;
			p[y] < t ? h -= 1 << t - p[y]++ - 1 : ++r;
		}
		for (; r >= 0 && h; --r) {
			var b = a[r].s;
			p[b] == t && (--p[b], ++h);
		}
		m = t;
	}
	return {
		t: new G(p),
		l: m
	};
}, qe = function(e, t, n) {
	return e.s == -1 ? Math.max(qe(e.l, t, n + 1), qe(e.r, t, n + 1)) : t[e.s] = n;
}, Je = function(e) {
	for (var t = e.length; t && !e[--t];);
	for (var n = new K(++t), r = 0, i = e[0], a = 1, o = function(e) {
		n[r++] = e;
	}, s = 1; s <= t; ++s) if (e[s] == i && s != t) ++a;
	else {
		if (!i && a > 2) {
			for (; a > 138; a -= 138) o(32754);
			a > 2 && (o(a > 10 ? a - 11 << 5 | 28690 : a - 3 << 5 | 12305), a = 0);
		} else if (a > 3) {
			for (o(i), --a; a > 6; a -= 6) o(8304);
			a > 2 && (o(a - 3 << 5 | 8208), a = 0);
		}
		for (; a--;) o(i);
		a = 1, i = e[s];
	}
	return {
		c: n.subarray(0, r),
		n: t
	};
}, Ye = function(e, t) {
	for (var n = 0, r = 0; r < t.length; ++r) n += e[r] * t[r];
	return n;
}, Xe = function(e, t, n) {
	var r = n.length, i = Be(t + 2);
	e[i] = r & 255, e[i + 1] = r >> 8, e[i + 2] = e[i] ^ 255, e[i + 3] = e[i + 1] ^ 255;
	for (var a = 0; a < r; ++a) e[i + a + 4] = n[a];
	return (i + 4 + r) * 8;
}, Ze = function(e, t, n, r, i, a, o, s, c, l, u) {
	We(t, u++, n), ++i[256];
	for (var d = Ke(i, 15), f = d.t, p = d.l, m = Ke(a, 15), h = m.t, g = m.l, _ = Je(f), v = _.c, y = _.n, b = Je(h), x = b.c, S = b.n, C = new K(19), w = 0; w < v.length; ++w) ++C[v[w] & 31];
	for (var w = 0; w < x.length; ++w) ++C[x[w] & 31];
	for (var T = Ke(C, 7), E = T.t, D = T.l, O = 19; O > 4 && !E[Se[O - 1]]; --O);
	var ee = l + 5 << 3, k = Ye(i, Me) + Ye(a, Ne) + o, A = Ye(i, f) + Ye(a, h) + o + 14 + 3 * O + Ye(C, E) + 2 * C[16] + 3 * C[17] + 7 * C[18];
	if (c >= 0 && ee <= k && ee <= A) return Xe(t, u, e.subarray(c, c + l));
	var j, M, N, P;
	if (We(t, u, 1 + (A < k)), u += 2, A < k) {
		j = J(f, p, 0), M = f, N = J(h, g, 0), P = h;
		var te = J(E, D, 0);
		We(t, u, y - 257), We(t, u + 5, S - 1), We(t, u + 10, O - 4), u += 14;
		for (var w = 0; w < O; ++w) We(t, u + 3 * w, E[Se[w]]);
		u += 3 * O;
		for (var F = [v, x], I = 0; I < 2; ++I) for (var L = F[I], w = 0; w < L.length; ++w) {
			var R = L[w] & 31;
			We(t, u, te[R]), u += E[R], R > 15 && (We(t, u, L[w] >> 5 & 127), u += L[w] >> 12);
		}
	} else j = Pe, M = Me, N = Ie, P = Ne;
	for (var w = 0; w < s; ++w) {
		var z = r[w];
		if (z > 255) {
			var R = z >> 18 & 31;
			Ge(t, u, j[R + 257]), u += M[R + 257], R > 7 && (We(t, u, z >> 23 & 31), u += be[R]);
			var B = z & 31;
			Ge(t, u, N[B]), u += P[B], B > 3 && (Ge(t, u, z >> 5 & 8191), u += xe[B]);
		} else Ge(t, u, j[z]), u += M[z];
	}
	return Ge(t, u, j[256]), u + M[256];
}, Qe = /* @__PURE__ */ new ye([
	65540,
	131080,
	131088,
	131104,
	262176,
	1048704,
	1048832,
	2114560,
	2117632
]), $e = /* @__PURE__ */ new G(0), et = function(e, t, n, r, i, a) {
	var o = a.z || e.length, s = new G(r + o + 5 * (1 + Math.ceil(o / 7e3)) + i), c = s.subarray(r, s.length - i), l = a.l, u = (a.r || 0) & 7;
	if (t) {
		u && (c[0] = a.r >> 3);
		for (var d = Qe[t - 1], f = d >> 13, p = d & 8191, m = (1 << n) - 1, h = a.p || new K(32768), g = a.h || new K(m + 1), _ = Math.ceil(n / 3), v = 2 * _, y = function(t) {
			return (e[t] ^ e[t + 1] << _ ^ e[t + 2] << v) & m;
		}, b = new ye(25e3), x = new K(288), S = new K(32), C = 0, w = 0, T = a.i || 0, E = 0, D = a.w || 0, O = 0; T + 2 < o; ++T) {
			var ee = y(T), k = T & 32767, A = g[ee];
			if (h[k] = A, g[ee] = k, D <= T) {
				var j = o - T;
				if ((C > 7e3 || E > 24576) && (j > 423 || !l)) {
					u = Ze(e, c, 0, b, x, S, w, E, O, T - O, u), E = C = w = 0, O = T;
					for (var M = 0; M < 286; ++M) x[M] = 0;
					for (var M = 0; M < 30; ++M) S[M] = 0;
				}
				var N = 2, P = 0, te = p, F = k - A & 32767;
				if (j > 2 && ee == y(T - F)) for (var I = Math.min(f, j) - 1, L = Math.min(32767, T), R = Math.min(258, j); F <= L && --te && k != A;) {
					if (e[T + N] == e[T + N - F]) {
						for (var z = 0; z < R && e[T + z] == e[T + z - F]; ++z);
						if (z > N) {
							if (N = z, P = F, z > I) break;
							for (var B = Math.min(F, z - 2), V = 0, M = 0; M < B; ++M) {
								var ne = T - F + M & 32767, H = ne - h[ne] & 32767;
								H > V && (V = H, A = ne);
							}
						}
					}
					k = A, A = h[k], F += k - A & 32767;
				}
				if (P) {
					b[E++] = 268435456 | Ee[N] << 18 | ke[P];
					var re = Ee[N] & 31, ie = ke[P] & 31;
					w += be[re] + xe[ie], ++x[257 + re], ++S[ie], D = T + N, ++C;
				} else b[E++] = e[T], ++x[e[T]];
			}
		}
		for (T = Math.max(T, D); T < o; ++T) b[E++] = e[T], ++x[e[T]];
		u = Ze(e, c, l, b, x, S, w, E, O, T - O, u), l || (a.r = u & 7 | c[u / 8 | 0] << 3, u -= 7, a.h = g, a.p = h, a.i = T, a.w = D);
	} else {
		for (var T = a.w || 0; T < o + l; T += 65535) {
			var ae = T + 65535;
			ae >= o && (c[u / 8 | 0] = l, ae = o), u = Xe(c, u + 1, e.subarray(T, ae));
		}
		a.i = o;
	}
	return Ve(s, 0, r + Be(u) + i);
}, tt = /* @__PURE__ */ (function() {
	for (var e = new Int32Array(256), t = 0; t < 256; ++t) {
		for (var n = t, r = 9; --r;) n = (n & 1 && -306674912) ^ n >>> 1;
		e[t] = n;
	}
	return e;
})(), nt = function() {
	var e = -1;
	return {
		p: function(t) {
			for (var n = e, r = 0; r < t.length; ++r) n = tt[n & 255 ^ t[r]] ^ n >>> 8;
			e = n;
		},
		d: function() {
			return ~e;
		}
	};
}, rt = function(e, t, n, r, i) {
	if (!i && (i = { l: 1 }, t.dictionary)) {
		var a = t.dictionary.subarray(-32768), o = new G(a.length + e.length);
		o.set(a), o.set(e, a.length), e = o, i.w = a.length;
	}
	return et(e, t.level == null ? 6 : t.level, t.mem == null ? i.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(e.length))) * 1.5) : 20 : 12 + t.mem, n, r, i);
}, it = function(e, t) {
	var n = {};
	for (var r in e) n[r] = e[r];
	for (var r in t) n[r] = t[r];
	return n;
}, Z = function(e, t) {
	return e[t] | e[t + 1] << 8;
}, Q = function(e, t) {
	return (e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0;
}, at = function(e, t) {
	return Q(e, t) + Q(e, t + 4) * 4294967296;
}, $ = function(e, t, n) {
	for (; n; ++t) e[t] = n, n >>>= 8;
};
function ot(e, t) {
	return rt(e, t || {}, 0, 0);
}
function st(e, t) {
	return Ue(e, { i: 2 }, t && t.out, t && t.dictionary);
}
var ct = function(e, t, n, r) {
	for (var i in e) {
		var a = e[i], o = t + i, s = r;
		Array.isArray(a) && (s = it(r, a[1]), a = a[0]), a instanceof G ? n[o] = [a, s] : (n[o += "/"] = [new G(0), s], ct(a, o, n, r));
	}
}, lt = typeof TextEncoder < "u" && /* @__PURE__ */ new TextEncoder(), ut = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder();
try {
	ut.decode($e, { stream: !0 });
} catch {}
var dt = function(e) {
	for (var t = "", n = 0;;) {
		var r = e[n++], i = (r > 127) + (r > 223) + (r > 239);
		if (n + i > e.length) return {
			s: t,
			r: Ve(e, n - 1)
		};
		i ? i == 3 ? (r = ((r & 15) << 18 | (e[n++] & 63) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) - 65536, t += String.fromCharCode(55296 | r >> 10, 56320 | r & 1023)) : i & 1 ? t += String.fromCharCode((r & 31) << 6 | e[n++] & 63) : t += String.fromCharCode((r & 15) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) : t += String.fromCharCode(r);
	}
};
function ft(e, t) {
	if (t) {
		for (var n = new G(e.length), r = 0; r < e.length; ++r) n[r] = e.charCodeAt(r);
		return n;
	}
	if (lt) return lt.encode(e);
	for (var i = e.length, a = new G(e.length + (e.length >> 1)), o = 0, s = function(e) {
		a[o++] = e;
	}, r = 0; r < i; ++r) {
		if (o + 5 > a.length) {
			var c = new G(o + 8 + (i - r << 1));
			c.set(a), a = c;
		}
		var l = e.charCodeAt(r);
		l < 128 || t ? s(l) : l < 2048 ? (s(192 | l >> 6), s(128 | l & 63)) : l > 55295 && l < 57344 ? (l = 65536 + (l & 1047552) | e.charCodeAt(++r) & 1023, s(240 | l >> 18), s(128 | l >> 12 & 63), s(128 | l >> 6 & 63), s(128 | l & 63)) : (s(224 | l >> 12), s(128 | l >> 6 & 63), s(128 | l & 63));
	}
	return Ve(a, 0, o);
}
function pt(e, t) {
	if (t) {
		for (var n = "", r = 0; r < e.length; r += 16384) n += String.fromCharCode.apply(null, e.subarray(r, r + 16384));
		return n;
	} else if (ut) return ut.decode(e);
	else {
		var i = dt(e), a = i.s, n = i.r;
		return n.length && X(8), a;
	}
}
var mt = function(e, t) {
	return t + 30 + Z(e, t + 26) + Z(e, t + 28);
}, ht = function(e, t, n) {
	var r = Z(e, t + 28), i = pt(e.subarray(t + 46, t + 46 + r), !(Z(e, t + 8) & 2048)), a = t + 46 + r, o = Q(e, t + 20), s = n && o == 4294967295 ? gt(e, a) : [
		o,
		Q(e, t + 24),
		Q(e, t + 42)
	], c = s[0], l = s[1], u = s[2];
	return [
		Z(e, t + 10),
		c,
		l,
		i,
		a + Z(e, t + 30) + Z(e, t + 32),
		u
	];
}, gt = function(e, t) {
	for (; Z(e, t) != 1; t += 4 + Z(e, t + 2));
	return [
		at(e, t + 12),
		at(e, t + 4),
		at(e, t + 20)
	];
}, _t = function(e) {
	var t = 0;
	if (e) for (var n in e) {
		var r = e[n].length;
		r > 65535 && X(9), t += r + 4;
	}
	return t;
}, vt = function(e, t, n, r, i, a, o, s) {
	var c = r.length, l = n.extra, u = s && s.length, d = _t(l);
	$(e, t, o == null ? 67324752 : 33639248), t += 4, o != null && (e[t++] = 20, e[t++] = n.os), e[t] = 20, t += 2, e[t++] = n.flag << 1 | (a < 0 && 8), e[t++] = i && 8, e[t++] = n.compression & 255, e[t++] = n.compression >> 8;
	var f = new Date(n.mtime == null ? Date.now() : n.mtime), p = f.getFullYear() - 1980;
	if ((p < 0 || p > 119) && X(10), $(e, t, p << 25 | f.getMonth() + 1 << 21 | f.getDate() << 16 | f.getHours() << 11 | f.getMinutes() << 5 | f.getSeconds() >> 1), t += 4, a != -1 && ($(e, t, n.crc), $(e, t + 4, a < 0 ? -a - 2 : a), $(e, t + 8, n.size)), $(e, t + 12, c), $(e, t + 14, d), t += 16, o != null && ($(e, t, u), $(e, t + 6, n.attrs), $(e, t + 10, o), t += 14), e.set(r, t), t += c, d) for (var m in l) {
		var h = l[m], g = h.length;
		$(e, t, +m), $(e, t + 2, g), e.set(h, t + 4), t += 4 + g;
	}
	return u && (e.set(s, t), t += u), t;
}, yt = function(e, t, n, r, i) {
	$(e, t, 101010256), $(e, t + 8, n), $(e, t + 10, n), $(e, t + 12, r), $(e, t + 16, i);
};
function bt(e, t) {
	t ||= {};
	var n = {}, r = [];
	ct(e, "", n, t);
	var i = 0, a = 0;
	for (var o in n) {
		var s = n[o], c = s[0], l = s[1], u = l.level == 0 ? 0 : 8, d = ft(o), f = d.length, p = l.comment, m = p && ft(p), h = m && m.length, g = _t(l.extra);
		f > 65535 && X(11);
		var _ = u ? ot(c, l) : c, v = _.length, y = nt();
		y.p(c), r.push(it(l, {
			size: c.length,
			crc: y.d(),
			c: _,
			f: d,
			m,
			u: f != o.length || m && p.length != h,
			o: i,
			compression: u
		})), i += 30 + f + g + v, a += 76 + 2 * (f + g) + (h || 0) + v;
	}
	for (var b = new G(a + 22), x = i, S = a - i, C = 0; C < r.length; ++C) {
		var d = r[C];
		vt(b, d.o, d, d.f, d.u, d.c.length);
		var w = 30 + d.f.length + _t(d.extra);
		b.set(d.c, d.o + w), vt(b, i, d, d.f, d.u, d.c.length, d.o, d.m), i += 16 + w + (d.m ? d.m.length : 0);
	}
	return yt(b, i, r.length, S, x), b;
}
function xt(e, t) {
	for (var n = {}, r = e.length - 22; Q(e, r) != 101010256; --r) (!r || e.length - r > 65558) && X(13);
	var i = Z(e, r + 8);
	if (!i) return {};
	var a = Q(e, r + 16), o = a == 4294967295 || i == 65535;
	if (o) {
		var s = Q(e, r - 12);
		o = Q(e, s) == 101075792, o && (i = Q(e, s + 32), a = Q(e, s + 48));
	}
	for (var c = t && t.filter, l = 0; l < i; ++l) {
		var u = ht(e, a, o), d = u[0], f = u[1], p = u[2], m = u[3], h = u[4], g = u[5], _ = mt(e, g);
		a = h, (!c || c({
			name: m,
			size: f,
			originalSize: p,
			compression: d
		})) && (d ? d == 8 ? n[m] = st(e.subarray(_, _ + f), { out: new G(p) }) : X(14, "unknown compression type " + d) : n[m] = Ve(e, _, _ + f));
	}
	return n;
}
//#endregion
//#region src/lib/project/memoryFS.ts
function St(e) {
	let t = /* @__PURE__ */ new Map();
	if (e) for (let n of e) {
		let e = n.webkitRelativePath, r = e.indexOf("/"), i = r >= 0 ? e.slice(r + 1) : e;
		i && t.set(i, n);
	}
	return Ct(t);
}
function Ct(e) {
	return {
		store: e,
		async readFile(t) {
			let n = e.get(t);
			if (!n) throw Error(`File not found: ${t}`);
			return n instanceof File ? n : new File([n], t.split("/").pop());
		},
		async writeFile(t, n) {
			e.set(t, typeof n == "string" ? new Blob([n], { type: "text/plain" }) : n);
		},
		async mkdir() {}
	};
}
function wt(e) {
	let t = xt(new Uint8Array(e)), n = /* @__PURE__ */ new Map(), r = Object.keys(t).filter((e) => !e.endsWith("/")), i = "";
	if (r.length > 0) {
		let e = r[0].indexOf("/");
		if (e >= 0) {
			let t = r[0].slice(0, e + 1);
			r.every((e) => e.startsWith(t)) && (i = t);
		}
	}
	for (let [e, r] of Object.entries(t)) {
		if (e.endsWith("/")) continue;
		let t = i ? e.slice(i.length) : e;
		t && n.set(t, new Blob([r.buffer]));
	}
	return Ct(n);
}
async function Tt(e) {
	let t = {};
	for (let [n, r] of e.store) {
		let e = await r.arrayBuffer();
		t[n] = new Uint8Array(e);
	}
	let n = bt(t);
	return new Blob([n.buffer], { type: "application/zip" });
}
function Et(e, t) {
	let n = URL.createObjectURL(e), r = document.createElement("a");
	r.href = n, r.download = t, r.click(), URL.revokeObjectURL(n);
}
//#endregion
//#region src/lib/project/handleStore.ts
var Dt = "project-handles", Ot = "recent-projects", kt = 10;
function At(e) {
	return new Promise((t, n) => {
		let r = indexedDB.open(e, 1);
		r.onupgradeneeded = () => {
			let e = r.result;
			e.objectStoreNames.contains(Dt) || e.createObjectStore(Dt);
		}, r.onsuccess = () => t(r.result), r.onerror = () => n(r.error);
	});
}
async function jt(e, t) {
	try {
		let n = (await Mt(e)).filter((e) => e.name !== t.name), r = [{
			name: t.name,
			handle: t
		}, ...n].slice(0, kt), i = await At(e);
		return new Promise((e, t) => {
			let n = i.transaction(Dt, "readwrite");
			n.objectStore(Dt).put(r, Ot), n.oncomplete = () => e(), n.onerror = () => t(n.error);
		});
	} catch {}
}
async function Mt(e) {
	try {
		let t = await At(e);
		return new Promise((e, n) => {
			let r = t.transaction(Dt, "readonly").objectStore(Dt).get(Ot);
			r.onsuccess = () => e(r.result ?? []), r.onerror = () => n(r.error);
		});
	} catch {
		return [];
	}
}
function Nt(e) {
	return {
		get: () => Mt(e),
		add: (t) => jt(e, t)
	};
}
//#endregion
//#region src/lib/project/projectHandle.ts
async function Pt() {
	if (_e()) {
		let e;
		try {
			e = await window.showDirectoryPicker({ mode: "readwrite" });
		} catch (e) {
			if (e instanceof DOMException && e.name === "AbortError") return null;
			throw e;
		}
		let t = ve(e);
		return await Vt(t), Ht(t, e.name, e);
	}
	let e = await Jt();
	if (!e || e.length === 0) return null;
	let t = e[0].webkitRelativePath.split("/")[0] || "project", n = St(e);
	return await Vt(n), Ut(n, t);
}
async function Ft() {
	let e = await qt(".zip,.glb,.gltf");
	return e ? Wt(e) : null;
}
async function It(e) {
	let t = e.dataTransfer?.items;
	if (!t || t.length === 0) return null;
	let n = t[0], r = n.getAsFile();
	if ("getAsFileSystemHandle" in n) {
		let e = null;
		try {
			e = await n.getAsFileSystemHandle();
		} catch {}
		if (e && e.kind === "directory") {
			let t = e;
			if (await t.requestPermission({ mode: "readwrite" }) === "granted") {
				let e = ve(t);
				return await Vt(e), Ht(e, t.name, t);
			}
		}
	}
	let i = n.webkitGetAsEntry?.();
	if (i?.isDirectory) {
		let e = await Yt(i);
		if (e.length > 0) {
			let t = i.name, n = St();
			for (let { path: t, file: r } of e) await n.writeFile(t, r);
			return await Vt(n), Ut(n, t);
		}
	}
	return r ? Wt(r) : null;
}
async function Lt(e) {
	await e.save();
}
async function Rt(e, t) {
	await e.export(t);
}
function zt(e) {
	return Ht(ve(e), e.name, e);
}
function Bt(e) {
	let t = e.split("/").pop() ?? "example", n = St();
	return {
		fs: {
			readFile: async (t) => {
				try {
					return await n.readFile(t);
				} catch {}
				let r = await fetch(`${e}/${t}`);
				if (!r.ok) throw Error(`Failed to fetch ${t}`);
				let i = await r.blob();
				return await n.writeFile(t, i), new File([i], t.split("/").pop());
			},
			writeFile: (e, t) => n.writeFile(e, t),
			mkdir: () => n.mkdir("")
		},
		name: t,
		canSaveInPlace: !1,
		async save() {
			Et(await Tt(n), `${t}.zip`);
		},
		async export(e) {
			Et(await Tt(n), e ?? `${t}.zip`);
		}
	};
}
async function Vt(e) {
	try {
		await e.readFile("scene.json");
	} catch {
		throw Error("Not a valid Vantage project (scene.json not found).");
	}
}
function Ht(e, t, n) {
	return {
		fs: e,
		name: t,
		canSaveInPlace: !0,
		directoryHandle: n,
		async save() {},
		async export(n) {
			Et(await Tt(await Kt(e, t)), n ?? `${t}.zip`);
		}
	};
}
function Ut(e, t) {
	return {
		fs: e,
		name: t,
		canSaveInPlace: !1,
		async save() {
			Et(await Tt(e), `${t}.zip`);
		},
		async export(n) {
			Et(await Tt(e), n ?? `${t}.zip`);
		}
	};
}
async function Wt(e) {
	let t = e.name.replace(/\.\w+$/, "");
	if (e.name.endsWith(".zip")) {
		let n = wt(await e.arrayBuffer());
		return await Vt(n), Ut(n, t);
	}
	if (re.MODEL.test(e.name)) return Ut(await Gt(e), t);
	throw Error(`Unsupported file type: ${e.name}. Expected .zip, .glb, or .gltf`);
}
async function Gt(e) {
	let { group: t, blob: n } = await oe(e), r = `models/${e.name}`, i = e.name.replace(/\.\w+$/, ""), a = se([{
		kind: "object",
		id: crypto.randomUUID(),
		name: i,
		object: t,
		visible: !0,
		locked: !1,
		source: {
			kind: "imported",
			relativePath: r
		}
	}]), o = St();
	for (let e of ie) await o.mkdir(e);
	return await o.writeFile(r, n), await o.writeFile("scene.json", JSON.stringify(a, null, 2)), o;
}
async function Kt(e, t) {
	let n = await e.readFile("scene.json"), r = JSON.parse(await n.text()), i = St();
	if (await i.writeFile("scene.json", n), r.objects) {
		for (let t of r.objects) if (t.source?.kind === "imported" && t.source.path) try {
			let n = await e.readFile(t.source.path);
			await i.writeFile(t.source.path, n);
		} catch {}
	}
	if (r.projections) {
		for (let t of r.projections) if (t.imagePath) try {
			let n = await e.readFile(t.imagePath);
			await i.writeFile(t.imagePath, n);
		} catch {}
	}
	return i;
}
function qt(e) {
	return new Promise((t) => {
		let n = document.createElement("input");
		n.type = "file", n.accept = e, n.addEventListener("change", () => {
			t(n.files?.[0] ?? null);
		}), n.addEventListener("cancel", () => t(null)), n.click();
	});
}
function Jt() {
	return new Promise((e) => {
		let t = document.createElement("input");
		t.type = "file", t.webkitdirectory = !0, t.addEventListener("change", () => {
			e(t.files ? Array.from(t.files) : null);
		}), t.addEventListener("cancel", () => e(null)), t.click();
	});
}
async function Yt(e, t = "") {
	let n = [], r = await Xt(e);
	for (let e of r) {
		let r = t ? `${t}/${e.name}` : e.name;
		if (e.isFile) {
			let t = await new Promise((t, n) => {
				e.file(t, n);
			});
			n.push({
				path: r,
				file: t
			});
		} else if (e.isDirectory) {
			let t = await Yt(e, r);
			n.push(...t);
		}
	}
	return n;
}
function Xt(e) {
	return new Promise((t, n) => {
		let r = e.createReader(), i = [];
		function a() {
			r.readEntries((e) => {
				e.length === 0 ? t(i) : (i.push(...e), a());
			}, n);
		}
		a();
	});
}
//#endregion
//#region src/lib/types.ts
var Zt = [
	"translate",
	"rotate",
	"scale"
];
//#endregion
export { H as CAMERA_DEFAULTS, C as CameraRig, T as DefaultEnvironment, U as ManifestValidationError, z as ProjectionHelper, N as ProjectionMaterial, ge as SceneViewer, Zt as TRANSFORM_TOOLS, E as UI_LAYER, P as VantageProjection, zt as createHandleFromDirectory, Bt as createHandleFromFetch, St as createMemoryFS, ve as createProjectFS, Nt as createRecentProjects, le as deserializeProjections, ce as deserializeScene, Et as downloadBlob, Tt as exportAsZip, Rt as exportProject, Ft as importProject, oe as loadGLTF, ne as loadTexture, wt as loadZip, It as onProjectDrop, Pt as openProject, Lt as saveProject, se as serializeScene, _e as supportsNativeFS, F as themeColorDefaults, I as themeColors, he as validateManifest };
