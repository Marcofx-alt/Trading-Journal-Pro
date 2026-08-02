'use client'
import {useEffect} from 'react'

export const defaultTheme={
  bg:'#080d1b', panel:'#121a2b', panel2:'#19233b', text:'#f6f8fc', muted:'#9fb0cf', border:'#2a3858', accent:'#7c9cff', chart:'#6ea8ff', positive:'#55d6a5', negative:'#ff7b8a'
}
export type Theme=typeof defaultTheme
export function applyTheme(t:Theme){const r=document.documentElement;Object.entries(t).forEach(([k,v])=>r.style.setProperty(`--${k}`,v));r.style.setProperty('--chart-primary',t.chart);r.style.setProperty('--good',t.positive);r.style.setProperty('--danger',t.negative)}
export function loadTheme():Theme{try{return {...defaultTheme,...JSON.parse(localStorage.getItem('tjp-theme')||'{}')}}catch{return defaultTheme}}
export default function ThemeProvider(){useEffect(()=>applyTheme(loadTheme()),[]);return null}
