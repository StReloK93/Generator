import{c as s,d as b,f as o,l as h,h as a,r as y,m as i,t,p,o as d,i as k}from"./index-YMoDQkPp.js";/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=s("ArrowLeftIcon",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=s("ChevronDownIcon",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=s("LayersIcon",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=s("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),v={class:"flex items-center justify-between"},V={key:0,class:"text-xs font-semibold text-slate-300"},w={class:"text-[11px] font-mono font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20"},g={class:"relative flex items-center py-1"},M=["value","min","max","step","disabled"],C={key:0,class:"flex items-center justify-between text-[10px] text-slate-400 font-mono"},z=b({__name:"UiSlider",props:{modelValue:{default:0},label:{default:""},min:{default:0},max:{default:100},step:{default:1},unit:{default:""},disabled:{type:Boolean,default:!1},showMinMax:{type:Boolean,default:!1},formatValue:{},customClass:{default:""}},emits:["update:modelValue","change"],setup(e,{emit:m}){const l=e,c=m,f=p(()=>l.formatValue?l.formatValue(l.modelValue):`${l.modelValue}${l.unit}`);function x(n){const u=n.target,r=Number(u.value);c("update:modelValue",r),c("change",r)}return(n,u)=>(d(),o("div",{class:h(["flex flex-col gap-1.5 select-none w-full",e.customClass])},[a("div",v,[e.label||n.$slots.label?(d(),o("label",V,[y(n.$slots,"label",{},()=>[k(t(e.label),1)])])):i("",!0),a("span",w,t(f.value),1)]),a("div",g,[a("input",{type:"range",value:e.modelValue,min:e.min,max:e.max,step:e.step,disabled:e.disabled,class:"w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-40 disabled:cursor-not-allowed",onInput:x},null,40,M)]),e.showMinMax?(d(),o("div",C,[a("span",null,t(e.min)+t(e.unit),1),a("span",null,t(e.max)+t(e.unit),1)])):i("",!0)],2))}});export{L as A,A as C,B as L,j as T,z as _};
