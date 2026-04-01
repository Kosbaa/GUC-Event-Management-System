import { createContext, useCallback, useContext, useRef } from "react";

const DashboardNavContext = createContext({
  navigateToSection: () => {},
  registerNavigator: () => {},
});

export const DashboardNavProvider = ({ children }) => {
  const navigatorRef = useRef(() => {});

  const navigateToSection = useCallback((sectionLabel) => {
    const navigator = navigatorRef.current;
    if (typeof navigator === "function") {
      navigator(sectionLabel);
    }
  }, []);

  const registerNavigator = useCallback((fn) => {
    navigatorRef.current = typeof fn === "function" ? fn : () => {};
  }, []);

  return (
    <DashboardNavContext.Provider
      value={{ navigateToSection, registerNavigator }}
    >
      {children}
    </DashboardNavContext.Provider>
  );
};

export const useDashboardNav = () => useContext(DashboardNavContext);
