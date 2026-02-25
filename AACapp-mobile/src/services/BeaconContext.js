/**
 * BeaconContext - Manages beacon detection state
 * Provides beacon ID to the entire application
 */

import React, { createContext, useState, useCallback } from 'react';

export const BeaconContext = createContext();

export const BeaconProvider = ({ children }) => {
  const [beaconId, setBeaconId] = useState(null);

  /**
   * Update the current beacon ID
   * This will be replaced with real BLE detection logic later
   */
  const updateBeaconId = useCallback((newBeaconId) => {
    setBeaconId(newBeaconId);
  }, []);

  const value = {
    beaconId,
    setBeaconId: updateBeaconId,
  };

  return (
    <BeaconContext.Provider value={value}>
      {children}
    </BeaconContext.Provider>
  );
};

/**
 * Custom hook to use BeaconContext
 */
export const useBeacon = () => {
  const context = React.useContext(BeaconContext);
  if (!context) {
    throw new Error('useBeacon must be used within a BeaconProvider');
  }
  return context;
};
