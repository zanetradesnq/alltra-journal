/**
 * Alltra v3 section sidebar — a faithful port of the production EnhancedLeftSidebar,
 * recoloured onto the journal's tokens. Sits right of the 64px app rail: a 52px
 * chrome band (collapse · search), the Tracker sections as coloured icon-tile rows
 * (Performance · Emotions · Journal / Trades · Calendar · Reports · Strategies),
 * and a footer with the Setup-guide progress pill + the profile pill.
 *
 * Icons are the exact @hugeicons-pro core-solid-rounded glyphs Alltra ships
 * (LaptopPerformance / HeartPulse / Book03 / Chart / Calendar02 / FileEmpty02 /
 * Cells / SidebarLeft / Search01), inlined as SVG so no icon package is needed.
 */
import { useState } from "react";
import type { CSSProperties } from "react";

export const RAIL_WIDTH_EXPANDED = 244;
export const RAIL_WIDTH_COLLAPSED = 72;

/* ── exact hugeicons-pro (core-solid-rounded) path data ─────────────────────── */
type GlyphDef = { d: string; evenodd?: boolean }[];
const GLYPHS: Record<string, GlyphDef> = {
  performance: [
    { d: "M21.8177 17.25H2.18283L0.910363 19.3935C0.902701 19.4065 0.895427 19.4196 0.888553 19.4329C0.443179 20.2975 1.10916 21.25 2.01603 21.25H21.9844C22.8913 21.25 23.5573 20.2975 23.1119 19.4329C23.1051 19.4196 23.0978 19.4065 23.0901 19.3935L21.8177 17.25Z" },
    { d: "M15.5538 2.75C16.6865 2.74998 17.6121 2.75041 18.3429 2.84863C19.1068 2.95134 19.7693 3.17346 20.298 3.70215C20.8267 4.23084 21.0488 4.89328 21.1515 5.65723C21.2497 6.38803 21.2501 7.31363 21.2501 8.44629V15.75H2.75012V8.44629C2.7501 7.31362 2.75053 6.38804 2.84876 5.65723C2.95147 4.89328 3.17358 4.23084 3.70227 3.70215C4.23096 3.17346 4.8934 2.95134 5.65735 2.84863C6.38815 2.75041 7.31375 2.74998 8.44641 2.75H15.5538ZM12.92 5.75293C12.5414 5.78334 12.2125 6.02622 12.0714 6.37891L10.8204 9.50684L10.3575 8.73535C10.1768 8.43424 9.85133 8.25 9.50012 8.25H7.50012C6.94784 8.25 6.50013 8.69772 6.50012 9.25C6.50012 9.80229 6.94784 10.25 7.50012 10.25H8.93372L10.1427 12.2646C10.3382 12.5903 10.7015 12.7774 11.0802 12.7471C11.4588 12.7167 11.7878 12.4738 11.9288 12.1211L13.1798 8.99316L13.6427 9.76465C13.8234 10.0658 14.1489 10.25 14.5001 10.25H16.5001C17.0524 10.25 17.5001 9.80229 17.5001 9.25C17.5001 8.69772 17.0524 8.25 16.5001 8.25H15.0665L13.8575 6.23535C13.6621 5.90967 13.2987 5.72259 12.92 5.75293Z" },
  ],
  emotions: [
    { evenodd: true, d: "M22.7908 13.2496C23.3768 12.0962 23.748 10.8938 23.748 9.69434C23.748 6.45202 21.3465 3.75 17.998 3.75C16.4062 3.75 14.8642 4.26267 12.998 5.96484C11.1319 4.26267 9.58989 3.75 7.99805 3.75C4.64961 3.75 2.2481 6.45202 2.24805 9.69434C2.24805 10.8938 2.61933 12.0962 3.20526 13.2496H8.83944C8.90944 13.2496 8.96471 13.2493 9.01229 13.2486C9.02956 13.2112 9.04955 13.1679 9.07381 13.1138L9.2408 12.7418L9.25968 12.6997C9.46666 12.2382 9.65434 11.8197 9.83944 11.525C9.99966 11.2699 10.3197 10.8404 10.8726 10.814H10.9859L11.1002 10.8257C11.6492 10.9089 11.9218 11.3713 12.0533 11.6421C12.2056 11.956 12.3469 12.3948 12.5021 12.8769L12.5142 12.9146L12.9781 14.357C13.0512 14.584 13.1125 14.7687 13.1646 14.9205C13.2433 14.7771 13.3375 14.6018 13.4508 14.3853L14.0699 13.2007L14.0842 13.1734C14.2071 12.9385 14.3265 12.7102 14.443 12.5367C14.56 12.3623 14.7635 12.1011 15.1109 11.9898L15.2066 11.9634C15.3986 11.9182 15.5987 11.9182 15.7906 11.9634L15.8863 11.9898L16.0094 12.0377C16.283 12.1645 16.4518 12.384 16.5543 12.5367C16.6707 12.7102 16.7901 12.9385 16.913 13.1734L16.9273 13.2007L16.9527 13.2496H22.7908ZM21.899 14.7496H17.0269L16.9828 14.7498C16.8266 14.7509 16.5743 14.7526 16.3414 14.6607C16.2188 14.6123 16.1031 14.5446 16.0006 14.4595C15.8031 14.2955 15.6866 14.0683 15.618 13.9345L15.5982 13.8961C15.5699 13.842 15.5439 13.7929 15.52 13.7479L15.4986 13.7076L15.477 13.7483C15.4536 13.7924 15.4266 13.8433 15.399 13.8961L14.7789 15.0806L14.7484 15.1389C14.5355 15.5459 14.3394 15.9209 14.149 16.1851C13.9634 16.4427 13.6007 16.8558 13.0094 16.8091C12.4135 16.762 12.1227 16.2917 11.983 16.0064C11.838 15.7105 11.7064 15.3016 11.5641 14.8596L11.5504 14.817L11.0865 13.3746C11.0066 13.1266 10.9397 12.9233 10.8824 12.7564C10.8062 12.9177 10.7171 13.115 10.609 13.356L10.443 13.7281L10.4364 13.7427C10.3817 13.8647 10.3177 14.0074 10.2476 14.1265C10.1645 14.2678 10.0424 14.4304 9.84432 14.5552C9.64839 14.6787 9.4509 14.7195 9.29158 14.7359C9.15766 14.7497 9.00433 14.7496 8.86673 14.7496L8.83944 14.7496H4.09704C4.54927 15.4168 5.05495 16.0575 5.5791 16.6602C7.37758 18.7279 9.52714 20.4969 10.96 21.5684C12.1755 22.4772 13.8206 22.4772 15.0361 21.5684C16.469 20.4969 18.6185 18.7279 20.417 16.6602C20.9411 16.0575 21.4468 15.4168 21.899 14.7496Z" },
  ],
  journal: [
    { d: "M15.9565 1.25001C16.8171 1.24995 17.5589 1.24982 18.1528 1.33008C18.79 1.41623 19.4006 1.61138 19.896 2.10938C20.3913 2.60734 20.5847 3.22092 20.6704 3.86133C20.7502 4.45822 20.7505 5.20364 20.7505 6.06836V17.8633C20.7505 18.403 20.3148 18.8408 19.7778 18.8408H19.688C19.6576 18.8768 19.6249 18.9161 19.5933 18.96C19.4259 19.1924 19.2925 19.4846 19.2925 19.8184C19.2925 20.152 19.4259 20.4434 19.5933 20.6758C19.6249 20.7198 19.6576 20.7598 19.688 20.7959H19.7778C20.3147 20.7959 20.7503 21.2329 20.7505 21.7725C20.7505 22.3122 20.3148 22.75 19.7778 22.75H6.16748C4.55671 22.75 3.25058 21.4375 3.25049 19.8184V8.03516C3.25047 6.70606 3.25084 5.61063 3.3667 4.74415C3.48798 3.83741 3.75226 3.03671 4.39014 2.39551C5.02795 1.7544 5.82414 1.48814 6.72607 1.36622C6.8151 1.35419 6.90659 1.34366 7.00049 1.33399V18.8398H6.16748C5.63054 18.8398 5.19483 19.2777 5.19482 19.8174C5.19497 20.357 5.63063 20.794 6.16748 20.794H17.5005C17.4087 20.5025 17.3482 20.1761 17.3481 19.8174C17.3481 19.4584 17.4086 19.1314 17.5005 18.8398H9.00049V1.25196C9.31765 1.24983 9.65096 1.25 10.0005 1.25001H15.9565Z" },
  ],
  trades: [
    { d: "M14.75 19.0109V19V5V4.98906C14.75 4.67831 14.75 4.40488 14.7334 4.17871C14.716 3.94259 14.6775 3.69936 14.5693 3.45898C14.3638 3.00221 13.9978 2.63624 13.541 2.43066C13.3006 2.32253 13.0574 2.28395 12.8213 2.2666C12.5951 2.25 12.3217 2.25 12.0109 2.25H12H11.9891C11.6783 2.25 11.4049 2.25 11.1787 2.2666C10.9426 2.28395 10.6994 2.32253 10.459 2.43066C10.0022 2.63624 9.63624 3.00221 9.43066 3.45898C9.32253 3.69936 9.28395 3.94259 9.2666 4.17871C9.25 4.40488 9.25 4.67831 9.25 4.98908V5V19V19.0109C9.25 19.3217 9.25 19.5951 9.2666 19.8213C9.28395 20.0574 9.32253 20.3006 9.43066 20.541C9.63624 20.9978 10.0022 21.3638 10.459 21.5693C10.6994 21.6775 10.9426 21.716 11.1787 21.7334C11.4049 21.75 11.6783 21.75 11.9891 21.75H12H12.0109C12.3217 21.75 12.5951 21.75 12.8213 21.7334C13.0574 21.716 13.3006 21.6775 13.541 21.5693C13.9978 21.3638 14.3638 20.9978 14.5693 20.541C14.6775 20.3006 14.716 20.0574 14.7334 19.8213C14.75 19.5951 14.75 19.3217 14.75 19.0109Z" },
    { d: "M7.75 19.0109V19V15V14.9891C7.75 14.6783 7.75 14.4049 7.7334 14.1787C7.71605 13.9426 7.67747 13.6994 7.56934 13.459C7.36376 13.0022 6.99779 12.6362 6.54102 12.4307C6.30064 12.3225 6.05741 12.284 5.82129 12.2666C5.59512 12.25 5.32169 12.25 5.01092 12.25H5H4.98908C4.67831 12.25 4.40488 12.25 4.17871 12.2666C3.94259 12.284 3.69936 12.3225 3.45898 12.4307C3.00221 12.6362 2.63624 13.0022 2.43066 13.459C2.32253 13.6994 2.28395 13.9426 2.2666 14.1787C2.25 14.4049 2.25 14.6783 2.25 14.9891V15V19V19.0109C2.25 19.3217 2.25 19.5951 2.2666 19.8213C2.28395 20.0574 2.32253 20.3006 2.43066 20.541C2.63624 20.9978 3.00221 21.3638 3.45898 21.5693C3.69936 21.6775 3.94259 21.716 4.17871 21.7334C4.40489 21.75 4.67832 21.75 4.98909 21.75H5H5.01091C5.32168 21.75 5.59511 21.75 5.82129 21.7334C6.05741 21.716 6.30064 21.6775 6.54102 21.5693C6.99779 21.3638 7.36376 20.9978 7.56934 20.541C7.67747 20.3006 7.71605 20.0574 7.7334 19.8213C7.75 19.5951 7.75 19.3217 7.75 19.0109Z" },
    { d: "M21.75 19.0109V19V10V9.98906C21.75 9.67831 21.75 9.40488 21.7334 9.17871C21.716 8.94259 21.6775 8.69936 21.5693 8.45898C21.3638 8.00221 20.9978 7.63624 20.541 7.43066C20.3006 7.32253 20.0574 7.28395 19.8213 7.2666C19.5951 7.25 19.3217 7.25 19.0109 7.25H19H18.9891C18.6783 7.25 18.4049 7.25 18.1787 7.2666C17.9426 7.28395 17.6994 7.32253 17.459 7.43066C17.0022 7.63624 16.6362 8.00221 16.4307 8.45898C16.3225 8.69936 16.284 8.94259 16.2666 9.17871C16.25 9.40488 16.25 9.67831 16.25 9.98908V10V19V19.0109C16.25 19.3217 16.25 19.5951 16.2666 19.8213C16.284 20.0574 16.3225 20.3006 16.4307 20.541C16.6362 20.9978 17.0022 21.3638 17.459 21.5693C17.6994 21.6775 17.9426 21.716 18.1787 21.7334C18.4049 21.75 18.6783 21.75 18.9891 21.75H19H19.0109C19.3217 21.75 19.5951 21.75 19.8213 21.7334C20.0574 21.716 20.3006 21.6775 20.541 21.5693C20.9978 21.3638 21.3638 20.9978 21.5693 20.541C21.6775 20.3006 21.716 20.0574 21.7334 19.8213C21.75 19.5951 21.75 19.3217 21.75 19.0109Z" },
  ],
  calendar: [
    { evenodd: true, d: "M8.1 1.25C8.63848 1.25 9.075 1.68754 9.075 2.22727V3.21284C9.6529 3.20453 10.2784 3.20453 10.9537 3.20454H13.0463C13.7216 3.20453 14.3471 3.20453 14.925 3.21284V2.22727C14.925 1.68754 15.3615 1.25 15.9 1.25C16.4385 1.25 16.875 1.68754 16.875 2.22727V3.29947C17.0513 3.31556 17.221 3.33437 17.3843 3.35638C18.5544 3.51407 19.5397 3.85141 20.3221 4.63573C21.1046 5.42004 21.4412 6.40758 21.5985 7.58045C21.75 8.71014 21.75 10.1465 21.75 11.9285V14.026C21.75 15.808 21.75 17.2444 21.5985 18.3741C21.4412 19.547 21.1046 20.5345 20.3221 21.3188C19.5397 22.1031 18.5544 22.4405 17.3843 22.5982C16.2572 22.75 14.8242 22.75 13.0463 22.75H10.9537C9.17581 22.75 7.74279 22.75 6.61573 22.5982C5.44558 22.4405 4.46035 22.1031 3.67786 21.3188C2.89537 20.5345 2.5588 19.547 2.40148 18.3741C2.24995 17.2444 2.24998 15.8081 2.25 14.0261V11.9285C2.24998 10.1465 2.24995 8.71012 2.40148 7.58045C2.5588 6.40758 2.89537 5.42004 3.67786 4.63573C4.46035 3.85141 5.44558 3.51407 6.61573 3.35638C6.77902 3.33437 6.94874 3.31556 7.125 3.29947V2.22727C7.125 1.68754 7.56152 1.25 8.1 1.25ZM4.21386 9.75C4.20045 10.3958 4.20001 11.1378 4.20001 12V13.9545C4.20001 15.8249 4.20208 17.1294 4.3341 18.1137C4.46235 19.0698 4.69693 19.5761 5.05673 19.9367C5.41652 20.2974 5.92166 20.5325 6.87557 20.6611C7.85752 20.7934 9.15897 20.7955 11.025 20.7955H12.975C14.8411 20.7955 16.1425 20.7934 17.1245 20.6611C18.0784 20.5325 18.5835 20.2974 18.9433 19.9367C19.3031 19.5761 19.5377 19.0698 19.6659 18.1137C19.7979 17.1294 19.8 15.8249 19.8 13.9545V12C19.8 11.1378 19.7996 10.3958 19.7862 9.75H4.21386Z" },
    { evenodd: true, d: "M10 13.2734C10 12.7212 10.4477 12.2734 11 12.2734H16C16.5523 12.2734 17 12.7212 17 13.2734C17 13.8257 16.5523 14.2734 16 14.2734H11C10.4477 14.2734 10 13.8257 10 13.2734ZM7 13.2734C7 12.7212 7.44772 12.2734 8 12.2734H8.00898C8.56127 12.2734 9.00898 12.7212 9.00898 13.2734C9.00898 13.8257 8.56127 14.2734 8.00898 14.2734H8C7.44772 14.2734 7 13.8257 7 13.2734ZM7 17.2734C7 16.7212 7.44772 16.2734 8 16.2734H13C13.5523 16.2734 14 16.7212 14 17.2734C14 17.8257 13.5523 18.2734 13 18.2734H8C7.44772 18.2734 7 17.8257 7 17.2734ZM14.991 17.2734C14.991 16.7212 15.4387 16.2734 15.991 16.2734H16C16.5523 16.2734 17 16.7212 17 17.2734C17 17.8257 16.5523 18.2734 16 18.2734H15.991C15.4387 18.2734 14.991 17.8257 14.991 17.2734Z" },
  ],
  reports: [
    { evenodd: true, d: "M13.1371 1.41733C12.6617 1.24866 12.1571 1.24934 11.5872 1.2501C10.0615 1.25008 8.65386 1.25017 7.6751 1.36504C6.66241 1.48389 5.79471 1.7369 5.05968 2.33261C4.78987 2.55128 4.5441 2.79833 4.32657 3.06954C3.73394 3.80839 3.48224 4.6806 3.364 5.69856C3.24972 6.6824 3.24974 7.91892 3.24976 9.45257V9.4526V9.45263V14.0261V14.0262V14.0262C3.24973 15.8081 3.24971 17.2445 3.4008 18.3741C3.55768 19.547 3.89327 20.5345 4.67352 21.3188C5.45377 22.1031 6.43619 22.4405 7.60298 22.5982C8.72681 22.75 10.2979 22.75 12.0707 22.75C13.8435 22.75 15.2724 22.75 16.3963 22.5982C17.5631 22.4405 18.5455 22.1031 19.3257 21.3188C20.106 20.5345 20.4416 19.547 20.5984 18.3741C20.7495 17.2445 20.7495 15.8081 20.7495 14.0261L20.7496 10.5518C20.7506 9.88846 20.7515 9.29971 20.5275 8.75596C20.3034 8.2122 19.8886 7.79654 19.4213 7.32819L14.6384 2.52054C14.236 2.11489 13.8797 1.75582 13.4249 1.53715C13.3311 1.49208 13.2351 1.45209 13.1371 1.41733ZM17.9509 8.6144C18.5689 9.2357 18.6743 9.36608 18.7311 9.50391C17.3635 9.50393 16.715 9.50314 15.848 9.38658C14.9479 9.26557 14.19 9.00667 13.5881 8.40476C12.9862 7.80284 12.7273 7.04497 12.6063 6.14486C12.49 5.27967 12.49 4.63195 12.49 3.2701V3.26172C12.6716 3.31641 12.813 3.44983 13.346 3.98554L17.9509 8.6144Z" },
  ],
  strategies: [
    { d: "M8.52801 1.75C8.765 1.74997 8.99342 1.74994 9.18834 1.76905C9.40735 1.79053 9.64136 1.84008 9.87349 1.97338C10.1058 2.1068 10.2665 2.28404 10.3952 2.46266C10.5095 2.62135 10.6239 2.81845 10.7423 3.02245L12.0205 5.22455C12.1389 5.42848 12.2534 5.62559 12.3344 5.80351C12.4256 6.00367 12.5 6.23153 12.5 6.5C12.5 6.76848 12.4256 6.99634 12.3344 7.1965C12.2534 7.37442 12.1389 7.57153 12.0205 7.77546L10.7423 9.97756C10.6239 10.1816 10.5095 10.3787 10.3952 10.5374C10.2665 10.716 10.1058 10.8932 9.87349 11.0266C9.64136 11.1599 9.40735 11.2095 9.18834 11.231C8.99342 11.2501 8.76501 11.25 8.52802 11.25H5.97198C5.73499 11.25 5.50658 11.2501 5.31165 11.231C5.09265 11.2095 4.85864 11.1599 4.62651 11.0266C4.39417 10.8932 4.23352 10.716 4.10481 10.5374C3.99046 10.3787 3.87609 10.1816 3.75771 9.97757L2.47947 7.77544C2.36106 7.57151 2.24661 7.37441 2.16559 7.1965C2.07443 6.99634 2 6.76848 2 6.5C2 6.23153 2.07443 6.00367 2.16559 5.80351C2.24661 5.6256 2.36106 5.4285 2.47946 5.22458L3.7577 3.02246C3.87608 2.81846 3.99046 2.62135 4.10481 2.46266C4.23352 2.28404 4.39417 2.1068 4.62651 1.97338C4.85864 1.84008 5.09265 1.79053 5.31166 1.76905C5.50658 1.74994 5.735 1.74997 5.97199 1.75L8.52801 1.75Z" },
    { d: "M8.52801 12.75C8.765 12.75 8.99342 12.7499 9.18834 12.7691C9.40735 12.7905 9.64136 12.8401 9.87349 12.9734C10.1058 13.1068 10.2665 13.284 10.3952 13.4627C10.5095 13.6213 10.6239 13.8185 10.7423 14.0224L12.0205 16.2245C12.1389 16.4285 12.2534 16.6256 12.3344 16.8035C12.4256 17.0037 12.5 17.2315 12.5 17.5C12.5 17.7685 12.4256 17.9963 12.3344 18.1965C12.2534 18.3744 12.1389 18.5715 12.0205 18.7755L10.7423 20.9776C10.6239 21.1816 10.5095 21.3787 10.3952 21.5374C10.2665 21.716 10.1058 21.8932 9.87349 22.0266C9.64136 22.1599 9.40735 22.2095 9.18834 22.231C8.99342 22.2501 8.76501 22.25 8.52802 22.25H5.97198C5.73499 22.25 5.50658 22.2501 5.31165 22.231C5.09265 22.2095 4.85864 22.1599 4.62651 22.0266C4.39417 21.8932 4.23352 21.716 4.10481 21.5374C3.99046 21.3787 3.87609 21.1816 3.75771 20.9776L2.47947 18.7754C2.36106 18.5715 2.24661 18.3744 2.16559 18.1965C2.07443 17.9963 2 17.7685 2 17.5C2 17.2315 2.07443 17.0037 2.16559 16.8035C2.24661 16.6256 2.36106 16.4285 2.47946 16.2246L3.7577 14.0225C3.87608 13.8185 3.99046 13.6213 4.10481 13.4627C4.23352 13.284 4.39417 13.1068 4.62651 12.9734C4.85864 12.8401 5.09265 12.7905 5.31166 12.7691C5.50658 12.7499 5.735 12.75 5.97199 12.75L8.52801 12.75Z" },
    { d: "M18.028 7.74999C18.265 7.74996 18.4934 7.74993 18.6883 7.76905C18.9074 7.79052 19.1414 7.84007 19.3735 7.97337C19.6058 8.10679 19.7665 8.28403 19.8952 8.46265C20.0095 8.62134 20.1239 8.81845 20.2423 9.02244L21.5205 11.2245C21.6389 11.4285 21.7534 11.6256 21.8344 11.8035C21.9256 12.0037 22 12.2315 22 12.5C22 12.7685 21.9256 12.9963 21.8344 13.1965C21.7534 13.3744 21.6389 13.5715 21.5205 13.7755L20.2423 15.9775C20.1239 16.1816 20.0095 16.3787 19.8952 16.5373C19.7665 16.716 19.6058 16.8932 19.3735 17.0266C19.1414 17.1599 18.9074 17.2095 18.6883 17.2309C18.4934 17.2501 18.265 17.25 18.028 17.25H15.472C15.235 17.25 15.0066 17.2501 14.8117 17.2309C14.5926 17.2095 14.3586 17.1599 14.1265 17.0266C13.8942 16.8932 13.7335 16.716 13.6048 16.5373C13.4905 16.3787 13.3761 16.1816 13.2577 15.9776L11.9795 13.7754C11.8611 13.5715 11.7466 13.3744 11.6656 13.1965C11.5744 12.9963 11.5 12.7685 11.5 12.5C11.5 12.2315 11.5744 12.0037 11.6656 11.8035C11.7466 11.6256 11.8611 11.4285 11.9795 11.2246L13.2577 9.02245C13.3761 8.81845 13.4905 8.62134 13.6048 8.46265C13.7335 8.28403 13.8942 8.10679 14.1265 7.97337C14.3586 7.84007 14.5926 7.79052 14.8117 7.76905C15.0066 7.74993 15.235 7.74996 15.472 7.74999L18.028 7.74999Z" },
  ],
  collapse: [
    { evenodd: true, d: "M14.0485 2.25H11.25C10.7786 2.25 10.5429 2.25 10.3964 2.39645C10.25 2.54289 10.25 2.7786 10.25 3.25L10.25 20.75C10.25 21.2214 10.25 21.4571 10.3964 21.6036C10.5429 21.75 10.7786 21.75 11.25 21.75H14.0486C15.6471 21.75 16.9135 21.75 17.9227 21.6303C18.961 21.5072 19.8141 21.2495 20.5452 20.6736C21.0463 20.2789 21.4778 19.792 21.8229 19.2375C22.3179 18.4422 22.5384 17.5216 22.645 16.3837C22.75 15.2629 22.75 13.8506 22.75 12.0395V11.9605C22.75 10.1494 22.75 8.73705 22.645 7.61632C22.5384 6.47837 22.3179 5.5578 21.8229 4.76246C21.4778 4.20797 21.0463 3.72109 20.5452 3.32638C19.8141 2.7505 18.961 2.49279 17.9227 2.36966C16.9135 2.24998 15.647 2.24999 14.0485 2.25ZM7.74415 21.7341C7.12171 21.7188 6.56897 21.6889 6.07727 21.6305C5.03896 21.5074 4.18587 21.2497 3.4548 20.6738C2.95374 20.2791 2.5222 19.7922 2.17708 19.2378C1.68205 18.4424 1.46162 17.5218 1.355 16.3839C1.24999 15.2631 1.24999 13.8508 1.25 12.0396V11.9608C1.24999 10.1496 1.24999 8.73727 1.355 7.61653C1.46162 6.47858 1.68205 5.55801 2.17708 4.76267C2.5222 4.20818 2.95374 3.7213 3.4548 3.32659C4.18587 2.75071 5.03896 2.493 6.07727 2.36987C6.56896 2.31157 7.12171 2.28167 7.74415 2.26634C8.21361 2.25477 8.44835 2.24899 8.59917 2.39615C8.75 2.54331 8.75 2.78164 8.75 3.25831V20.7421C8.75 21.2188 8.75 21.4571 8.59917 21.6043C8.44835 21.7514 8.21361 21.7456 7.74415 21.7341ZM6.25 6.96094C6.25 6.54672 5.91421 6.21094 5.5 6.21094H4.5C4.08579 6.21094 3.75 6.54672 3.75 6.96094C3.75 7.37515 4.08579 7.71094 4.5 7.71094H5.5C5.91421 7.71094 6.25 7.37515 6.25 6.96094ZM6.25 9.96094C6.25 9.54672 5.91421 9.21094 5.5 9.21094H4.5C4.08579 9.21094 3.75 9.54672 3.75 9.96094C3.75 10.3752 4.08579 10.7109 4.5 10.7109H5.5C5.91421 10.7109 6.25 10.3752 6.25 9.96094Z" },
  ],
  search: [
    { evenodd: true, d: "M11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C13.125 20 15.078 19.2635 16.6177 18.0319L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L18.0319 16.6177C19.2635 15.078 20 13.125 20 11C20 6.02944 15.9706 2 11 2ZM4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11Z" },
  ],
};

/* small stroke icons for the Journal tree */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        marginLeft: "auto",
        flexShrink: 0,
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 0.16s ease",
        color: "var(--text-tertiary)",
      }}
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function NotesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 4.5h9l5 5V19.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.75 4.5V9a1 1 0 0 0 1 1h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function Glyph({ id, size }: { id: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      {GLYPHS[id].map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="currentColor"
          fillRule={p.evenodd ? "evenodd" : undefined}
          clipRule={p.evenodd ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );
}

export interface NavSection {
  id: string;
  label: string;
  comingSoon?: boolean;
}

const PRIMARY: NavSection[] = [
  { id: "performance", label: "Performance" },
  { id: "emotions", label: "Emotions" },
  { id: "journal", label: "Journal" },
];
const TOOLS: NavSection[] = [
  { id: "trades", label: "Trades" },
  { id: "calendar", label: "Calendar" },
  { id: "reports", label: "Reports" },
  { id: "strategies", label: "Strategies", comingSoon: true },
];

// The Apple-style accent gradient the production icon tiles wear (getAlltraIconGradient, dark arm).
const ICON_GRADIENT =
  "radial-gradient(circle at 30% 30%, var(--alltra-brand) 0%, color-mix(in srgb, var(--alltra-brand) 95%, transparent) 50%, var(--accent-hover) 98%), linear-gradient(135deg, color-mix(in srgb, var(--alltra-brand) 96%, transparent) 0%, var(--accent-hover) 100%)";

export interface JournalTreeEntry {
  index: number;
  label: string;
  title: string;
  snippet: string;
}
export interface JournalTree {
  entries: JournalTreeEntry[];
  currentPage: number;
  onSelectEntry: (index: number) => void;
  onNewEntry: () => void;
  onOpenNotes: () => void;
  newDisabled?: boolean;
}

export function AlltraSideNav({
  section,
  onSelect,
  onSearch,
  collapsed,
  onToggleCollapse,
  journal,
  identity = { name: "Hussein", handle: "@hussein", initial: "H" },
}: {
  section: string;
  onSelect: (id: string) => void;
  onSearch: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  journal?: JournalTree;
  identity?: { name: string; handle: string; initial: string };
}) {
  const width = collapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_EXPANDED;
  // Journal tab expands into a tree of entries (the "old side-panel" navigation).
  // Closed by default so clicking Journal "drops" it open.
  const [journalOpen, setJournalOpen] = useState(false);

  const treeItem = (active: boolean, disabled?: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    border: "none",
    background: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    fontWeight: active ? 600 : 500,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 12.5,
    lineHeight: 1.35,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    transition: "background 0.12s, color 0.12s",
  });

  const tile: CSSProperties = {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 28,
    borderRadius: 8,
    background: "var(--alpha-4)",
    border: "none",
    display: "grid",
    placeItems: "center",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "background 0.12s, opacity 0.12s",
  };

  const row = (s: NavSection) => {
    const active = section === s.id;
    const expandable = s.id === "journal" && !!journal;
    return (
      <button
        key={s.id}
        className="alltra-nav-row"
        data-active={active || undefined}
        disabled={s.comingSoon}
        onClick={() => {
          if (s.comingSoon) return;
          onSelect(s.id);
          if (expandable) setJournalOpen((o) => !o);
        }}
        title={collapsed ? s.label : undefined}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: 44,
          borderRadius: "var(--r)",
          border: "none",
          background: "transparent",
          padding: 8,
          cursor: s.comingSoon ? "not-allowed" : "pointer",
          opacity: s.comingSoon ? 0.5 : 1,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: collapsed ? 10 : 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: ICON_GRADIENT,
            color: "var(--on-brand)",
            transition: "left 0.2s cubic-bezier(0.22,0.61,0.36,1)",
          }}
        >
          <Glyph id={s.id} size={16} />
        </span>
        <span
          style={{
            position: "absolute",
            left: 48,
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: collapsed ? 0 : 1,
            transition: "opacity 0.15s",
            color: active ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          {s.label}
          {expandable && <Chevron open={journalOpen} />}
          {s.comingSoon && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: "var(--text-tertiary)",
                background: "var(--alpha-6)",
                padding: "2px 5px",
                borderRadius: 5,
              }}
            >
              Upcoming
            </span>
          )}
        </span>
      </button>
    );
  };

  // the entry tree that drops under the Journal row
  const journalTree = () => {
    if (!journal) return null;
    const ellipsis: CSSProperties = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      minWidth: 0,
    };
    return (
      <div
        style={{
          margin: "3px 0 8px 21px",
          paddingLeft: 11,
          borderLeft: "1px solid var(--border-2)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <button
          className="alltra-tree-item"
          onClick={journal.onNewEntry}
          disabled={journal.newDisabled}
          title={journal.newDisabled ? "10 entries max per day" : "New journal entry"}
          style={{
            ...treeItem(false, journal.newDisabled),
            color: "var(--alltra-brand)",
            fontWeight: 600,
          }}
        >
          <PlusIcon />
          <span>New entry</span>
        </button>

        <div
          className="hide-scrollbar"
          style={{
            maxHeight: 300,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            margin: "3px 0",
          }}
        >
          {journal.entries.length === 0 ? (
            <span style={{ padding: "6px 9px", fontSize: 12, color: "var(--text-tertiary)" }}>
              No entries yet
            </span>
          ) : (
            journal.entries.map((e) => {
              const active = e.index === journal.currentPage;
              const label =
                e.title?.trim() || e.snippet?.trim() || e.label || "Untitled";
              return (
                <button
                  key={e.index}
                  className="alltra-tree-item"
                  data-active={active || undefined}
                  onClick={() => journal.onSelectEntry(e.index)}
                  title={label}
                  style={treeItem(active)}
                >
                  <span style={ellipsis}>{label}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      paddingLeft: 8,
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      flexShrink: 0,
                    }}
                  >
                    {e.label}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <button
          className="alltra-tree-item"
          onClick={journal.onOpenNotes}
          title="Open Notes"
          style={treeItem(false)}
        >
          <NotesIcon />
          <span>Notes</span>
        </button>
      </div>
    );
  };

  return (
    <aside
      className="alltra-sidenav hide-scrollbar"
      style={{
        position: "absolute",
        left: 64,
        top: 0,
        bottom: 0,
        width,
        boxSizing: "border-box",
        background: "var(--surface-2)",
        boxShadow: "inset -1px 0 0 0 var(--border-2)",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
        transition: "width 0.24s cubic-bezier(0.22,0.61,0.36,1)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* chrome band — collapse · search */}
      <div
        className="flex flex-shrink-0 items-center"
        style={{
          height: 52,
          boxSizing: "border-box",
          padding: 12,
          gap: collapsed ? 0 : 8,
          borderBottom: "1px solid var(--border-2)",
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="alltra-chrome-tile"
          style={tile}
        >
          <Glyph id="collapse" size={16} />
        </button>
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search"
          title="Search (⌘K)"
          disabled={collapsed}
          className="alltra-chrome-tile"
          style={{
            ...tile,
            flexGrow: collapsed ? 0 : 1,
            opacity: collapsed ? 0 : 1,
          }}
        >
          <Glyph id="search" size={16} />
        </button>
      </div>

      {/* nav groups */}
      <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12 }}>
          {PRIMARY.map((s) =>
            s.id === "journal" && journal ? (
              <div key={s.id}>
                {row(s)}
                {journalOpen && !collapsed && journalTree()}
              </div>
            ) : (
              row(s)
            )
          )}
        </nav>
        <div style={{ padding: "0 12px" }}>
          <div style={{ height: 1, background: "var(--border-2)" }} />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12 }}>
          {TOOLS.map(row)}
        </nav>
      </div>

      {/* footer — setup guide + profile */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {!collapsed && (
          <button
            className="alltra-nav-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderRadius: "var(--r)",
              border: "1px solid var(--border-2)",
              background: "var(--alpha-4)",
              padding: "9px 12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>Setup guide</span>
            <span style={{ position: "relative", width: 18, height: 18 }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7" fill="none" stroke="var(--alpha-10)" strokeWidth="2.5" />
                <circle
                  cx="9" cy="9" r="7" fill="none"
                  stroke="var(--alltra-brand)" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 7 * 0.6} ${2 * Math.PI * 7}`}
                  transform="rotate(-90 9 9)"
                />
              </svg>
            </span>
          </button>
        )}
        <div
          className="alltra-nav-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: "var(--r)",
            padding: collapsed ? 6 : "6px 8px",
            cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: "50%",
              background: "var(--alltra-brand)",
              color: "var(--on-brand)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {identity.initial}
          </span>
          {!collapsed && (
            <span style={{ minWidth: 0, lineHeight: 1.25 }}>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
                {identity.name}
              </span>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)" }}>
                {identity.handle}
              </span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AlltraSideNav;
