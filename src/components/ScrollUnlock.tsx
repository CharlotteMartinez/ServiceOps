import { useEffect } from "react";

function ScrollUnlock(): null {
  useEffect(() => {
    // Ensure body scrolling is enabled when this component is mounted globally
    document.body.style.overflow = "auto";
  }, []);

  return null;
}

export default ScrollUnlock;



