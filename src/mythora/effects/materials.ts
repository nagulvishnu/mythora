import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { env } from "../lib/env";

export const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.02+7.1; a*=.5; } return s; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
`;

const FRAG_END = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
`;

type U = Record<string, THREE.IUniform>;

export function shader(vertex: string, fragment: string, uniforms: U, opts: Partial<THREE.ShaderMaterialParameters> & { fog?: boolean } = {}) {
  const useFog = opts.fog !== false;
  const m = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: "uniform float uTime;\nuniform float uGlow;\nuniform float uNight;\n" + fragment,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uGlow: { value: 1 }, uNight: { value: 0 } }, uniforms]),
    fog: useFog,
    ...opts,
  });
  return m;
}

/** register a material so uTime / uGlow / uNight are kept up to date, and dispose on unmount */
export function useTimeMaterial(make: () => THREE.ShaderMaterial, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const m = useMemo(make, deps);
  useFrame((s) => {
    m.uniforms.uTime.value = s.clock.elapsedTime;
    m.uniforms.uGlow.value = env.glow;
    m.uniforms.uNight.value = env.night;
  });
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

const VERT_STD = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
#include <fog_pars_vertex>
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position,1.);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vView = cameraPosition - wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FOG_FRAG = `#include <fog_pars_fragment>\n`;

/* ----------------------------- SKY ----------------------------- */
export function makeSkyMaterial(style: number) {
  return shader(
    /* glsl */ `varying vec3 vDir; void main(){ vDir = position; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_Position.z = gl_Position.w; }`,
    /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop, uHorizon, uSunColor, uSunDir, uCloudColor;
uniform float uStars, uCloud, uFlash, uStyle;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float t = pow(max(d.y,0.),0.5);
  vec3 col = mix(uHorizon, uTop, t);
  col = mix(col, uHorizon*0.55, smoothstep(0.,-0.25,d.y));
  float s = max(dot(d,uSunDir),0.);
  col += uSunColor*(pow(s,900.)*4. + pow(s,14.)*0.35 + pow(s,3.)*0.14);
  // stars
  vec3 sp = d*520.;
  vec3 id = floor(sp);
  float r = fract(sin(dot(id,vec3(12.9898,78.233,37.719)))*43758.5453);
  float dist = length(fract(sp)-.5);
  float star = smoothstep(.3,.0,dist)*step(.993,r);
  col += vec3(.85,.92,1.)*star*uStars*smoothstep(0.0,0.25,d.y)*(0.5+0.5*sin(uTime*2.+r*90.));
  // clouds
  if(d.y > 0.0){
    vec2 p = d.xz/(d.y+0.22)*1.3 + vec2(uTime*0.012, uTime*0.006);
    float n = fbm(p*1.4);
    float c = smoothstep(1.02-uCloud*0.75, 1.02-uCloud*0.75+0.28, n);
    col = mix(col, uCloudColor*(0.65+0.5*s), c*0.85*smoothstep(0.0,0.2,d.y));
  }
  if(uStyle > 0.5){
    vec3 c0 = normalize(vec3(0.3,0.38,-0.9));
    float a = acos(clamp(dot(d,c0),-1.,1.));
    float disc = smoothstep(0.17,0.16,a);
    float corona = exp(-pow((a-0.175)*22.,2.));
    col = mix(col, vec3(0.0), disc);
    col += mix(vec3(.7,.2,1.), vec3(.2,.8,1.), 0.5+0.5*sin(uTime*.3+a*30.))*corona*1.4;
    float ang = atan(d.z,d.x);
    float band = fbm(vec2(cos(ang)*2.5 + uTime*0.03, sin(ang)*2.5 + d.y*7.0 - uTime*0.02));
    col += mix(vec3(.45,.1,.7), vec3(.1,.55,.85), band) * pow(band,2.0) * 0.9 * smoothstep(-0.1,0.5,d.y) * (1.0-smoothstep(0.5,1.0,d.y));
    // faint ring around the dark sun
    float ring = exp(-pow((dot(d,vec3(0.,1.,0.))-0.02-0.25*sin(ang))*14.,2.))*0.0;
    col += ring;
  }
  col += uFlash*vec3(.55,.62,.9);
  gl_FragColor = vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uCloudColor: { value: new THREE.Color() },
      uStars: { value: 0 },
      uCloud: { value: 0.5 },
      uFlash: { value: 0 },
      uStyle: { value: style },
    },
    { side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false },
  );
}

/* ----------------------------- WATER ----------------------------- */
export function makeWaterMaterial(deep: string, shallow: string, opacity = 0.88, choppy = 1) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uDeep, uShallow, uSky, uSkyTop, uSunDir, uSunColor;
uniform float uOpacity, uChoppy;
${NOISE}
${FOG_FRAG}
float hgt(vec2 p){ float t=uTime; return fbm(p*0.35+vec2(t*0.05,t*0.03))*1.6 + noise(p*1.3+vec2(-t*0.2,t*0.15))*0.35*uChoppy; }
void main(){
  vec2 p = vWorld.xz;
  float e=0.12;
  float h = hgt(p);
  vec3 n = normalize(vec3(-(hgt(p+vec2(e,0.))-h)/e*0.35, 1., -(hgt(p+vec2(0.,e))-h)/e*0.35));
  vec3 V = normalize(vView);
  float fr = pow(1.-max(dot(n,V),0.),3.2);
  vec3 R = reflect(-V,n);
  vec3 sky = mix(uSky, uSkyTop, pow(clamp(R.y,0.,1.),0.5));
  vec3 base = mix(uDeep, uShallow, smoothstep(0.2,1.8,h)*0.6);
  vec3 col = mix(base, sky, clamp(fr*1.15+0.08,0.,1.));
  col += uSunColor*pow(max(dot(R,uSunDir),0.),220.)*2.5;
  float alpha = mix(uOpacity, 1., fr);
  gl_FragColor = vec4(col, alpha);
  ${FRAG_END}
}`,
    {
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uSky: { value: new THREE.Color() },
      uSkyTop: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uOpacity: { value: opacity },
      uChoppy: { value: choppy },
    },
    { transparent: true, depthWrite: false },
  );
}

/* ----------------------------- LAVA ----------------------------- */
export function makeLavaMaterial() {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
${NOISE}
${FOG_FRAG}
void main(){
  vec2 q = vec2(vWorld.x*0.06, vWorld.z*0.06 - uTime*0.05);
  float w = fbm(q*2.0 + fbm(q*3.0 + uTime*0.04)*2.2);
  float crust = smoothstep(0.36,0.62,w);
  vec3 col = mix(vec3(0.03,0.005,0.0), vec3(1.0,0.22,0.02), crust);
  col = mix(col, vec3(1.0,0.78,0.22), smoothstep(0.62,0.9,w));
  col *= 1.0 + 0.25*sin(uTime*1.5 + w*10.);
  gl_FragColor = vec4(col*1.3,1.);
  ${FRAG_END}
}`,
    {},
    {},
  );
}

/* ----------------------------- WATERFALL ----------------------------- */
export function makeWaterfallMaterial(tint = "#cfeeff") {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uTint;
${NOISE}
${FOG_FRAG}
void main(){
  float edge = smoothstep(0.0,0.18,vUv.x)*smoothstep(1.0,0.82,vUv.x);
  float n = noise(vec2(vUv.x*16., vUv.y*4. + uTime*3.2));
  float n2 = noise(vec2(vUv.x*34.+3., vUv.y*9. + uTime*5.0));
  float streak = n*0.65 + n2*0.5;
  float foam = smoothstep(0.1,0.0,vUv.y) * (0.6+0.4*noise(vec2(vUv.x*20., uTime*3.)));
  float a = clamp(smoothstep(0.25,0.85,streak)*edge*0.85 + foam, 0., 1.);
  a *= smoothstep(1.0,0.97,vUv.y);
  vec3 col = mix(uTint*0.8, vec3(1.), streak*0.7 + foam);
  gl_FragColor = vec4(col, a*0.9);
  ${FRAG_END}
}`,
    { uTint: { value: new THREE.Color(tint) } },
    { transparent: true, depthWrite: false, side: THREE.DoubleSide },
  );
}

/* ----------------------------- PORTAL ----------------------------- */
export function makePortalMaterial(type: number, c1: string, c2: string, c3: string) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uC1, uC2, uC3; uniform float uType, uAct, uHover;
${NOISE}
${FOG_FRAG}
float box(vec2 p, vec2 c, vec2 s){ vec2 d = abs(p-c)-s; return step(max(d.x,d.y),0.); }
vec3 preview(vec2 uv, float type){
  float t = uTime;
  vec3 col = vec3(0.);
  if(type < 0.5){ // AETHERIA – sky, clouds, floating islands, castle
    col = mix(uC2, uC1, smoothstep(0.1,1.,uv.y));
    float cl = smoothstep(0.45,0.8,fbm(vec2(uv.x*3.+t*0.05, uv.y*5.)));
    col = mix(col, vec3(1.), cl*0.55*smoothstep(0.6,0.0,uv.y));
    for(int i=0;i<3;i++){
      float fi=float(i);
      vec2 c = vec2(0.22+fi*0.28, 0.45+0.12*sin(t*0.5+fi*2.)+fi*0.05);
      float w = 0.17 - fi*0.025;
      float dx = abs(uv.x-c.x);
      float isl = step(dx,w)*step(c.y-(w-dx)*1.6, uv.y)*step(uv.y, c.y+0.015);
      col = mix(col, vec3(0.12,0.16,0.22), isl);
      col = mix(col, vec3(0.5,0.85,0.4), isl*step(c.y, uv.y)*0.9);
      if(i==1){ float tw = box(uv, vec2(c.x, c.y+0.09), vec2(0.018,0.085)) + box(uv, vec2(c.x-0.05,c.y+0.06), vec2(0.012,0.05)) + box(uv, vec2(c.x+0.05,c.y+0.06), vec2(0.012,0.05)); col = mix(col, vec3(1.,.95,.85), clamp(tw,0.,1.)); }
    }
  } else if(type < 1.5){ // EVERGREEN – dark canopy, trunks, fireflies
    col = mix(uC2*0.5, uC1*0.45, uv.y);
    float shaft = smoothstep(0.5,0.0,abs(uv.x-0.5+(uv.y-0.5)*0.4))*0.25;
    col += uC3*shaft;
    for(int i=0;i<5;i++){
      float fi=float(i);
      float x = 0.1+fi*0.2+0.04*sin(fi*7.);
      float w = 0.035+0.018*hash(vec2(fi,2.));
      col = mix(col, vec3(0.02,0.05,0.04), step(abs(uv.x-x), w*(1.0+(1.0-uv.y)*0.6)));
    }
    float can = smoothstep(0.52,0.7,fbm(uv*vec2(4.,3.)+vec2(0.,-1.))+uv.y*0.55);
    col = mix(col, vec3(0.02,0.14,0.07), can);
    vec2 g = uv*18.; vec2 gi=floor(g); float h=hash(gi);
    float ff = smoothstep(0.3,0.0,length(fract(g)-0.5+0.25*sin(t+h*6.28)))*step(0.82,h)*(0.5+0.5*sin(t*2.+h*20.));
    col += vec3(0.9,1.,0.5)*ff;
  } else if(type < 2.5){ // DRAGONFALL – burning sky, mountains, lava, dragon
    col = mix(uC2, uC1, pow(uv.y,0.7));
    float ridge = 0.28 + 0.22*fbm(vec2(uv.x*3.,1.)) + 0.18*fbm(vec2(uv.x*7.,5.));
    col = mix(col, vec3(0.05,0.02,0.02), step(uv.y, ridge));
    float lava = step(uv.y, 0.12)*(0.6+0.6*fbm(vec2(uv.x*10.+t*0.3, uv.y*20.)));
    col = mix(col, uC3*1.3, lava);
    float dx = fract(t*0.07)*1.4-0.2;
    vec2 q = vec2(uv.x-dx, uv.y-0.68);
    float flap = sin(t*4.)*0.4;
    float wing = smoothstep(0.012,0.0,abs(q.y - (0.06*abs(q.x)*(1.+flap)*-1. + 0.03) ))*step(abs(q.x),0.13);
    float body = smoothstep(0.02,0.0,length(q*vec2(0.5,1.2)));
    col = mix(col, vec3(0.02), clamp(wing+body,0.,1.));
  } else if(type < 3.5){ // ELDORIA – golden dusk, columns, arch
    col = mix(uC2, uC1, smoothstep(0.1,1.,uv.y));
    float sun = smoothstep(0.2,0.0,length(uv-vec2(0.5,0.52)));
    col += vec3(1.,0.8,0.4)*sun*0.6;
    float ground = step(uv.y, 0.2);
    col = mix(col, vec3(0.05,0.07,0.05), ground);
    for(int i=0;i<4;i++){
      float fi=float(i);
      float x = 0.12 + fi*0.25;
      float hgt = 0.2 + 0.4*hash(vec2(fi,7.)) ;
      col = mix(col, vec3(0.06,0.06,0.06), box(uv, vec2(x, hgt*0.5), vec2(0.028, hgt*0.5)));
    }
    float ar = abs(length((uv-vec2(0.5,0.2))*vec2(1.,1.))-0.2);
    col = mix(col, vec3(0.05), step(ar,0.025)*step(0.2,uv.y));
  } else { // UMBRACIA – void sky, eclipse, dark islands
    col = mix(uC1*0.3, uC2*0.9, pow(1.-uv.y,2.));
    float a = atan(uv.y-0.62, uv.x-0.5);
    float b = fbm(vec2(cos(a+t*0.1)*2.+length(uv-0.5)*6., sin(a+t*0.1)*2.-t*0.2));
    col += mix(uC2, uC3, b)*b*0.5;
    float d = length(uv-vec2(0.5,0.62));
    col = mix(col, vec3(0.), smoothstep(0.14,0.13,d));
    col += uC3*exp(-pow((d-0.15)*30.,2.))*1.5;
    for(int i=0;i<3;i++){
      float fi=float(i);
      vec2 c = vec2(0.2+fi*0.3, 0.25+0.08*sin(t*0.6+fi*3.));
      float w=0.13; float dx=abs(uv.x-c.x);
      float isl = step(dx,w)*step(c.y-0.02, uv.y)*step(uv.y, c.y+(w-dx)*1.3);
      col = mix(col, vec3(0.02,0.0,0.05), isl);
    }
    vec2 g = uv*22.; float h=hash(floor(g));
    col += uC3*smoothstep(0.25,0.0,length(fract(g)-0.5))*step(0.9,h)*(0.5+0.5*sin(t*3.+h*30.));
  }
  return col;
}
void main(){
  vec2 p = vUv*2.-1.;
  float r = length(p);
  if(r > 1.0) discard;
  float zoom = 1.0 - uAct*0.35;
  float sw = sin(uTime*0.6 + r*4.)*(0.04+uAct*0.12);
  vec2 q = rot(sw + uAct*r*2.2)*p*zoom;
  vec3 col = preview(q*0.5+0.5, uType);
  // swirling magical veil
  float ang = atan(p.y,p.x);
  float sv = fbm(vec2(cos(ang+uTime*0.3)*1.8 + r*3., sin(ang+uTime*0.3)*1.8 - uTime*0.5 + r*2.));
  col = mix(col, uC3*1.4, sv*(0.28 + uAct*0.55));
  float rim = smoothstep(0.7,1.0,r);
  col += uC3*rim*(0.9+uAct*1.5+uHover*0.5);
  col += uC3*pow(max(0.,1.-r),3.)*uAct*2.0;
  col *= 0.85 + 0.25*uHover;
  gl_FragColor = vec4(col, 1.0);
  ${FRAG_END}
}`,
    { uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uC3: { value: new THREE.Color(c3) }, uType: { value: type }, uAct: { value: 0 }, uHover: { value: 0 } },
    { side: THREE.DoubleSide },
  );
}

/* ----------------------------- MAGIC CIRCLE ----------------------------- */
export function makeCircleMaterial(color: string) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uColor; uniform float uSpin;
${NOISE}
${FOG_FRAG}
float ring(float r, float c, float w){ return smoothstep(w,0.,abs(r-c)); }
void main(){
  vec2 p = vUv*2.-1.;
  float r = length(p);
  if(r>1.0) discard;
  float a = atan(p.y,p.x);
  float t = uTime*uSpin;
  float v = ring(r,0.97,0.012)+ring(r,0.9,0.006)+ring(r,0.62,0.01)+ring(r,0.38,0.008);
  // rune ticks between 0.9 and 0.97
  float sector = floor((a+3.14159+t*0.3)/6.28318*48.);
  float h = hash(vec2(sector,3.));
  float tick = step(0.9,r)*step(r,0.968)*step(0.45,h)*step(abs(fract((a+3.14159+t*0.3)/6.28318*48.)-0.5),0.28);
  v += tick*0.8;
  // rotating star polygon
  float k = 6.;
  float aa = mod(a + t, 6.28318/k) - 3.14159/k;
  float poly = abs(r*cos(aa) - 0.5);
  v += smoothstep(0.012,0.0,poly)*step(r,0.9)*0.9;
  float k2 = 3.; float a2 = mod(a - t*1.5, 6.28318/k2) - 3.14159/k2;
  v += smoothstep(0.01,0.0,abs(r*cos(a2)-0.32))*step(r,0.6)*0.9;
  v += smoothstep(0.1,0.,r)*0.6;
  float glow = (0.55 + 0.45*sin(uTime*1.3));
  v *= (0.7+0.5*glow)*(0.5+uGlow);
  gl_FragColor = vec4(uColor*v*1.4, clamp(v,0.,1.));
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) }, uSpin: { value: 0.4 } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide },
  );
}

/* ----------------------------- RUNE GLYPHS (instanced) ----------------------------- */
export function makeGlyphMaterial(color: string) {
  return shader(
    /* glsl */ `
attribute float aSeed; varying vec2 vUv; varying float vSeed;
#include <fog_pars_vertex>
void main(){ vUv=uv; vSeed=aSeed; vec4 mvPosition = viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); gl_Position = projectionMatrix*mvPosition;
 #include <fog_vertex>
}`,
    /* glsl */ `
varying vec2 vUv; varying float vSeed; uniform vec3 uColor;
${NOISE}
${FOG_FRAG}
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
void main(){
  vec2 p = vUv-0.5; float s = vSeed;
  float d = seg(p, vec2(0.,-.36), vec2(0.,.36));
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 a = vec2(-.3+.6*hash(vec2(s,fi*7.1)), -.34+.68*hash(vec2(s*1.7,fi*3.3)));
    vec2 b = vec2(-.3+.6*hash(vec2(s*2.3,fi*5.9)), -.34+.68*hash(vec2(s*.7,fi+11.)));
    if(hash(vec2(s,fi))>0.22) d = min(d, seg(p,a,b));
  }
  float line = smoothstep(0.045,0.018,d);
  float glow = exp(-d*16.)*0.45;
  float pulse = 0.55+0.45*sin(uTime*1.4+s*40.);
  float v = (line+glow)*pulse*(0.4+uGlow);
  gl_FragColor = vec4(uColor*v*1.6, clamp(v,0.,1.));
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide },
  );
}

/* ----------------------------- BEAM ----------------------------- */
export function makeBeamMaterial(color: string, intensity = 1) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uColor; uniform float uIntensity, uBoost;
${NOISE}
${FOG_FRAG}
void main(){
  float fr = pow(abs(dot(normalize(vN), normalize(vView))), 1.4);
  float y = vUv.y;
  float a = fr*pow(1.-y,1.3)*smoothstep(0.0,0.04,y);
  a *= 0.75+0.25*noise(vec2(vUv.x*6.+uTime*0.5, y*5.-uTime*1.2));
  a *= uIntensity*(0.55+uBoost);
  gl_FragColor = vec4(uColor*(1.+a), clamp(a,0.,1.));
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uBoost: { value: 0 } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide },
  );
}

/* ----------------------------- ENERGY STREAM ----------------------------- */
export function makeFlowMaterial(color: string, rep = 12, speed = 0.6) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uColor; uniform float uRep, uSpeed;
${FOG_FRAG}
void main(){
  float f = fract(vUv.x*uRep - uTime*uSpeed);
  float dash = smoothstep(0.0,0.35,f)*smoothstep(1.0,0.35,f);
  float core = pow(abs(dot(normalize(vN),normalize(vView))),2.0);
  float a = (0.18 + dash*0.9)*core;
  gl_FragColor = vec4(uColor*(0.8+dash*1.4), a);
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) }, uRep: { value: rep }, uSpeed: { value: speed } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide },
  );
}

/* ----------------------------- ENERGY FIELD / VOID ----------------------------- */
export function makeFieldMaterial(color: string, color2: string) {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
uniform vec3 uColor, uColor2;
${NOISE}
${FOG_FRAG}
void main(){
  float fr = pow(1.-abs(dot(normalize(vN),normalize(vView))), 2.2);
  float n = fbm(vWorld.xz*0.05 + vec2(vWorld.y*0.04, -uTime*0.1));
  float band = 0.5+0.5*sin(vWorld.y*0.35 + n*6. - uTime*0.8);
  float a = (fr*0.9 + band*0.12) * (0.5+n);
  gl_FragColor = vec4(mix(uColor,uColor2,band), a*0.55);
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide },
  );
}

export function makeVoidMaterial() {
  return shader(
    VERT_STD,
    /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
${NOISE}
${FOG_FRAG}
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(vView);
  float fr = pow(1.-abs(dot(n,v)),3.0);
  float sw = fbm(vec2(atan(n.z,n.x)*2.+uTime*0.5, n.y*4.-uTime*0.4));
  vec3 col = mix(vec3(0.0,0.0,0.02), vec3(0.45,0.1,0.8), sw*fr*2.0);
  col += vec3(0.2,0.7,1.0)*fr*1.2*(0.6+0.4*sin(uTime*2.));
  gl_FragColor = vec4(col,1.);
  ${FRAG_END}
}`,
    {},
    {},
  );
}

export function makeWraithMaterial(color: string) {
  return shader(
    /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vView; uniform float uTime;
#include <fog_pars_vertex>
void main(){
  vUv = uv;
  vec3 p = position;
  float k = 1.-uv.y;
  p.x += sin(uTime*2.+position.y*3.)*0.25*k;
  p.z += cos(uTime*1.7+position.y*2.5)*0.25*k;
  vec4 wp = modelMatrix*vec4(p,1.);
  vN = normalize(mat3(modelMatrix)*normal);
  vView = cameraPosition-wp.xyz;
  vec4 mvPosition = viewMatrix*wp;
  gl_Position = projectionMatrix*mvPosition;
  #include <fog_vertex>
}`,
    /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vView; uniform vec3 uColor;
${NOISE}
${FOG_FRAG}
void main(){
  float fr = pow(1.-abs(dot(normalize(vN),normalize(vView))),1.6);
  float n = fbm(vec2(vUv.x*6., vUv.y*4.-uTime*0.8));
  float a = (0.18+fr*0.9)*smoothstep(0.0,0.35,vUv.y+n*0.25-0.1)*(0.4+n);
  gl_FragColor = vec4(mix(vec3(0.02,0.0,0.06), uColor, fr), a);
  ${FRAG_END}
}`,
    { uColor: { value: new THREE.Color(color) } },
    { transparent: true, depthWrite: false, side: THREE.DoubleSide },
  );
}
