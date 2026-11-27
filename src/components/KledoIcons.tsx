"use client";

import React from "react";

const B = "#3b76f6";
const B2 = "#6899ff";

function Shadow() {
  return <ellipse cx="12" cy="22.3" rx="6.5" ry="1.1" fill="#dbe5f7" />;
}

export function IconBeranda() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M3 10.5L12 3l9 7.5V19a2 2 0 0 1-2 2h-4.5v-5.5h-5V21H5a2 2 0 0 1-2-2v-8.5z" fill={B} />
    </svg>
  );
}

export function IconPenjualan() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" stroke={B2} strokeWidth="2" strokeLinecap="round" />
      <rect x="4.5" y="7" width="15" height="13.5" rx="3" fill={B} />
      <path d="M12 16.5V11m0 0-2.5 2.5M12 11l2.5 2.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPembelian() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" stroke={B2} strokeWidth="2" strokeLinecap="round" />
      <rect x="4.5" y="7" width="15" height="13.5" rx="3" fill={B} />
      <path d="M12 11v5.5m0 0-2.5-2.5M12 16.5l2.5-2.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBiaya() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16.5l-2.3-1.4-2.3 1.4L12 19.1l-2.4 1.4-2.3-1.4L5 20.5V4z" fill={B} />
      <path d="M8.5 7.5h7M8.5 11.5h7M8.5 15h4.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconProduk() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M12 2.5L20 7v10l-8 4.5L4 17V7l8-4.5z" fill={B} />
      <path d="M4 7l8 4.5L20 7M12 11.5v10" stroke="#9ec0ff" strokeWidth="1.5" />
    </svg>
  );
}

export function IconInventori() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M3 10L12 3.5 21 10v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5V10z" fill={B} />
      <rect x="7" y="12.5" width="4" height="4" rx="0.8" fill="#fff" />
      <rect x="13" y="12.5" width="4" height="4" rx="0.8" fill="#fff" />
    </svg>
  );
}

export function IconLaporan() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <rect x="7.5" y="11.5" width="2" height="4.5" rx="0.8" fill="#fff" />
      <rect x="11" y="9" width="2" height="7" rx="0.8" fill="#fff" />
      <rect x="14.5" y="7" width="2" height="9" rx="0.8" fill="#fff" />
    </svg>
  );
}

export function IconKasBank() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <circle cx="14.5" cy="6.2" r="3.2" fill="#f5b041" />
      <circle cx="14.5" cy="6.2" r="1.6" fill="#fde3a7" />
      <rect x="3.5" y="6.5" width="17" height="13" rx="3" fill={B} />
      <rect x="14" y="11" width="6.5" height="4" rx="1.5" fill={B2} />
      <circle cx="16.2" cy="13" r="1" fill="#fff" />
    </svg>
  );
}

export function IconAkun() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="5" y="3" width="14" height="17" rx="2.5" fill={B} />
      <rect x="5" y="3" width="3.5" height="17" rx="1.5" fill={B2} />
      <path d="M11 8h5M11 11.5h4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="10.5" y="3" width="2.5" height="4.5" rx="0.5" fill="#fbd38d" />
    </svg>
  );
}

export function IconJurnal() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconKontak() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="3" y="5" width="18" height="13.5" rx="2.5" fill={B} />
      <circle cx="8.5" cy="10.5" r="2" fill="#fff" />
      <path d="M5.5 15.5c.7-1.6 2-2.2 3-2.2s2.3.6 3 2.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 10h4M14 13.5h3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconPengaturan() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <circle cx="12" cy="11.5" r="2.6" stroke="#fff" strokeWidth="2" />
      <path d="M12 6.8v1.2M12 15v1.2M7.3 11.5h1.2M15.5 11.5h1.2M8.7 8.2l.9.9M14.4 13.9l.9.9M15.3 8.2l-.9.9M9.6 13.9l-.9.9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconQuickJual() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b76f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14l1 12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L5 7z" />
      <path d="M9 11a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function IconQuickBiaya() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b76f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3z" />
      <path d="M12 8v8" />
      <path d="M14.2 9.8c0-1-1-1.6-2.2-1.6s-2.2.6-2.2 1.6c0 1 .9 1.4 2.2 1.7 1.3.3 2.2.7 2.2 1.7 0 1-1 1.6-2.2 1.6s-2.2-.6-2.2-1.6" />
    </svg>
  );
}

export function IconSubOverview() {
  return (
    <svg width="19" height="20" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <rect x="7.5" y="7" width="3.7" height="3.7" rx="1" fill="#fff" />
      <rect x="12.8" y="7" width="3.7" height="3.7" rx="1" fill="#fff" />
      <rect x="7.5" y="12.3" width="3.7" height="3.7" rx="1" fill="#fff" />
      <rect x="12.8" y="12.3" width="3.7" height="3.7" rx="1" fill="#fff" />
    </svg>
  );
}

export function IconSubTagihan() {
  return (
    <svg width="19" height="20" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <path d="M8.5 7h7v9l-1.7-1-1.8 1-1.8-1-1.7 1V7z" fill="#fff" />
      <path d="M10 10h4M10 12.5h3" stroke={B} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconSubPengiriman() {
  return (
    <svg width="19" height="20" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <path d="M7 9.5h6.5v4.5H7V9.5zm6.5 1.5h2.2l1.3 1.5V14h-3.5v-3z" fill="#fff" />
      <circle cx="9.2" cy="14.8" r="1.2" fill="#fff" />
      <circle cx="15" cy="14.8" r="1.2" fill="#fff" />
    </svg>
  );
}

export function IconSubPemesanan() {
  return (
    <svg width="19" height="20" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <path d="M7 8.5h1.5l1.2 5h5.5l1-3.5H9.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10.5" cy="15.5" r="1" fill="#fff" />
      <circle cx="14.8" cy="15.5" r="1" fill="#fff" />
    </svg>
  );
}

export function IconSubPenawaran() {
  return (
    <svg width="19" height="20" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="3.5" width="16" height="16" rx="4" fill={B} />
      <path d="M8.5 7h5l2 2v7h-7V7z" fill="#fff" />
      <path d="M10 11h4M10 13.5h3" stroke={B} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconPromo() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <path d="M12.5 3H7a2 2 0 0 0-2 2v5.5l9 9a2.12 2.12 0 0 0 3-3l-7-7z" fill={B} />
      <circle cx="8" cy="8" r="1.5" fill="#fff" />
    </svg>
  );
}

export function IconKasir() {
  return (
    <svg width="21" height="22" viewBox="0 0 24 24" fill="none">
      <Shadow />
      <rect x="4" y="5" width="16" height="15" rx="3" fill={B} />
      <rect x="7" y="8" width="10" height="4" rx="1" fill="#fff" />
      <circle cx="8.5" cy="15.5" r="1" fill="#fff" />
      <circle cx="12" cy="15.5" r="1" fill="#fff" />
      <circle cx="15.5" cy="15.5" r="1" fill="#fff" />
    </svg>
  );
}
