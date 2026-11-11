import{c as i}from"./index-DcZku4PE.js";/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=i("FlameIcon",[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",key:"96xj49"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=i("SnowflakeIcon",[["path",{d:"m10 20-1.25-2.5L6 18",key:"18frcb"}],["path",{d:"M10 4 8.75 6.5 6 6",key:"7mghy3"}],["path",{d:"m14 20 1.25-2.5L18 18",key:"1chtki"}],["path",{d:"m14 4 1.25 2.5L18 6",key:"1b4wsy"}],["path",{d:"m17 21-3-6h-4",key:"15hhxa"}],["path",{d:"m17 3-3 6 1.5 3",key:"11697g"}],["path",{d:"M2 12h6.5L10 9",key:"kv9z4n"}],["path",{d:"m20 10-1.5 2 1.5 2",key:"1swlpi"}],["path",{d:"M22 12h-6.5L14 15",key:"1mxi28"}],["path",{d:"m4 10 1.5 2L4 14",key:"k9enpj"}],["path",{d:"m7 21 3-6-1.5-3",key:"j8hb9u"}],["path",{d:"m7 3 3 6h4",key:"1otusx"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=i("ZapIcon",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);function b(t){return t.behavior!=="flying"}function u(t,c=Math.random){const h=Math.max(1,Math.round(t.count)),a=[];for(let e=0;e<h;e++){const s=e-(h-1)/2;switch(t.pattern){case"helix":case"orbit":a.push({offsetPerp:t.spread,phaseOffset:Math.PI*2*e/h,delay:0});break;case"stagger":a.push({offsetPerp:s*t.spread*.4,phaseOffset:0,delay:e*.12});break;case"scatter":a.push({offsetPerp:(c()-.5)*2*t.spread,phaseOffset:c()*Math.PI*2,delay:c()*.15});break;default:a.push({offsetPerp:h===1?0:s*t.spread,phaseOffset:0,delay:0})}}return a}function I(t,c,h,a=0,e=0){const s=Math.min(1,Math.max(0,c)),o=Math.sin(s*Math.PI),{launch:p,motion:r}=t;let n=0,l=o*Math.min(140,h*.38)*r.arc;switch(p.pattern){case"fan":case"scatter":n=a*o;break;case"helix":n=a*Math.sin(s*Math.PI*2*p.turns+e)*Math.min(1,o*3);break;case"orbit":{const d=e+s*Math.PI*2*p.turns,k=Math.min(1,o*3);n=Math.cos(d)*a*k,l+=Math.sin(d)*a*.7*k;break}default:n=a}return r.wobble>0&&(n+=Math.sin(s*Math.PI*2*r.wobbleFreq+e)*r.wobble*o),{side:n,lift:l}}export{f as F,m as S,y as Z,I as f,b as i,u as l};
