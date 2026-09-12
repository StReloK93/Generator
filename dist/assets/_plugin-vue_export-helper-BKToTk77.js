import{c as r,d as b,o as c,a as u,n as y,i as t,f as h,k as p,t as l,b as f,g as k}from"./index-BkTIx47K.js";/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=r("LayersIcon",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=r("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=r("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),v={class:"flex items-center justify-between"},V={key:0,class:"text-xs font-semibold text-slate-300"},g={class:"text-[11px] font-mono font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20"},w={class:"relative flex items-center py-1"},M=["value","min","max","step","disabled"],I={key:0,class:"flex items-center justify-between text-[10px] text-slate-400 font-mono"},L=b({__name:"UiSlider",props:{modelValue:{default:0},label:{default:""},min:{default:0},max:{default:100},step:{default:1},unit:{default:""},disabled:{type:Boolean,default:!1},showMinMax:{type:Boolean,default:!1},formatValue:{},customClass:{default:""}},emits:["update:modelValue","change"],setup(e,{emit:o}){const a=e,n=o,d=k(()=>a.formatValue?a.formatValue(a.modelValue):`${a.modelValue}${a.unit}`);function x(s){const i=s.target,m=Number(i.value);n("update:modelValue",m),n("change",m)}return(s,i)=>(c(),u("div",{class:y(["flex flex-col gap-1.5 select-none w-full",e.customClass])},[t("div",v,[e.label||s.$slots.label?(c(),u("label",V,[h(s.$slots,"label",{},()=>[p(l(e.label),1)])])):f("",!0),t("span",g,l(d.value),1)]),t("div",w,[t("input",{type:"range",value:e.modelValue,min:e.min,max:e.max,step:e.step,disabled:e.disabled,class:"w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-40 disabled:cursor-not-allowed",onInput:x},null,40,M)]),e.showMinMax?(c(),u("div",I,[t("span",null,l(e.min)+l(e.unit),1),t("span",null,l(e.max)+l(e.unit),1)])):f("",!0)],2))}}),q=(e,o)=>{const a=e.__vccOpts||e;for(const[n,d]of o)a[n]=d;return a};export{j as L,B as S,C as T,q as _,L as a};
