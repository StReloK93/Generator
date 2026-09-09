import{c as d,d as x,l as s,f as o,n as y,h as a,r as b,p,t,i as r,k}from"./index-ebrSYYdw.js";/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=d("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=d("SparklesIcon",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-vue-next v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=d("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),v={class:"flex items-center justify-between"},V={key:0,class:"text-xs font-semibold text-slate-300"},g={class:"text-[11px] font-mono font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20"},M={class:"relative flex items-center py-1"},w=["value","min","max","step","disabled"],S={key:0,class:"flex items-center justify-between text-[10px] text-slate-400 font-mono"},L=x({__name:"UiSlider",props:{modelValue:{default:0},label:{default:""},min:{default:0},max:{default:100},step:{default:1},unit:{default:""},disabled:{type:Boolean,default:!1},showMinMax:{type:Boolean,default:!1},formatValue:{},customClass:{default:""}},emits:["update:modelValue","change"],setup(e,{emit:m}){const l=e,c=m,f=k(()=>l.formatValue?l.formatValue(l.modelValue):`${l.modelValue}${l.unit}`);function h(n){const u=n.target,i=Number(u.value);c("update:modelValue",i),c("change",i)}return(n,u)=>(s(),o("div",{class:y(["flex flex-col gap-1.5 select-none w-full",e.customClass])},[a("div",v,[e.label||n.$slots.label?(s(),o("label",V,[b(n.$slots,"label",{},()=>[p(t(e.label),1)])])):r("",!0),a("span",g,t(f.value),1)]),a("div",M,[a("input",{type:"range",value:e.modelValue,min:e.min,max:e.max,step:e.step,disabled:e.disabled,class:"w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-40 disabled:cursor-not-allowed",onInput:h},null,40,w)]),e.showMinMax?(s(),o("div",S,[a("span",null,t(e.min)+t(e.unit),1),a("span",null,t(e.max)+t(e.unit),1)])):r("",!0)],2))}});export{j as S,C as T,L as _,B as a};
