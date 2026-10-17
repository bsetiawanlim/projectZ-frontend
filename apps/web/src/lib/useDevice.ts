"use client";

import { useState, useEffect } from "react";

export interface DeviceInfo {
  isMobile: boolean;          // true if on phone/small tablet or mobile user-agent
  isSmallScreen: boolean;     // window.innerWidth <= 768px
  isPhone: boolean;           // window.innerWidth <= 640px OR mobile phone UA
  isTablet: boolean;          // 769px <= window.innerWidth <= 1024px
  isDesktop: boolean;         // window.innerWidth > 1024px
  isAndroid: boolean;         // Android OS detected via UserAgent
  isIOS: boolean;             // iOS (iPhone/iPad/iPod) detected via UserAgent
  isTouch: boolean;           // Touch-capable device
  orientation: "portrait" | "landscape";
  screenWidth: number;
  screenHeight: number;
  compactMenuPreferred: boolean; // Auto-compact menu when screen is smaller (Android, iPhone, etc.)
  isMounted: boolean;         // Client hydration complete
}

const DEFAULT_DESKTOP_DEVICE: DeviceInfo = {
  isMobile: false,
  isSmallScreen: false,
  isPhone: false,
  isTablet: false,
  isDesktop: true,
  isAndroid: false,
  isIOS: false,
  isTouch: false,
  orientation: "landscape",
  screenWidth: 1280,
  screenHeight: 800,
  compactMenuPreferred: false,
  isMounted: false,
};

export function readDeviceState(): DeviceInfo {
  if (typeof window === "undefined") {
    return DEFAULT_DESKTOP_DEVICE;
  }

  const ua = window.navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const isSmallScreen = screenWidth <= 768;
  const isPhone = screenWidth <= 640 || ((isAndroid || isIOS) && screenWidth <= 768);
  const isTablet = screenWidth > 768 && screenWidth <= 1024;
  const isDesktop = screenWidth > 1024 && !isMobileUA;
  const isMobile = isSmallScreen || isPhone || isMobileUA;

  // Compact menu is strongly preferred when screen is small, or on phone devices like Android & iPhone
  const compactMenuPreferred = isSmallScreen || isPhone || isAndroid || (isIOS && screenWidth <= 820);
  const orientation = screenHeight >= screenWidth ? "portrait" : "landscape";

  return {
    isMobile,
    isSmallScreen,
    isPhone,
    isTablet,
    isDesktop,
    isAndroid,
    isIOS,
    isTouch,
    orientation,
    screenWidth,
    screenHeight,
    compactMenuPreferred,
    isMounted: true,
  };
}

/**
 * React hook to reactively read user device dimensions, mobile OS (Android, iPhone),
 * and provide screen density signals for compact navigation menus.
 */
export function useDevice(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(DEFAULT_DESKTOP_DEVICE);

  useEffect(() => {
    const handleUpdate = () => {
      setDevice(readDeviceState());
    };

    // Initial check on client mount
    handleUpdate();

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("orientationchange", handleUpdate, { passive: true });

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("orientationchange", handleUpdate);
    };
  }, []);

  return device;
}
