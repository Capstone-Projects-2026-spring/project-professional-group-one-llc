/**
 * useLocationDetection.test.js
 */

import { renderHook, act } from '@testing-library/react-native';
import useLocationDetection from '../src/hooks/useLocationDetection';

// Mock the room data layer with a controlled set of rooms
const mockRooms = [
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'living_room', label: 'Living Room' },
];

jest.mock('../data/roomContexts', () => ({
  getAllRooms: jest.fn(() => mockRooms),
  getRoomByBeaconId: jest.fn(),
}));

describe('useLocationDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initial state has no current room', () => {
    // On first render, no room should be selected
    const { result } = renderHook(() => useLocationDetection());

    expect(result.current.currentRoom).toBeNull();
  });

  test('detectionMode is "manual"', () => {
    // Current implementation uses manual mode only (BLE is future work)
    const { result } = renderHook(() => useLocationDetection());

    expect(result.current.detectionMode).toBe('manual');
  });

  test('allRooms returns all room definitions from the data layer', () => {
    // The hook should expose the full room list without modification
    const { result } = renderHook(() => useLocationDetection());

    expect(result.current.allRooms).toEqual(mockRooms);
  });

  test('setRoomManually sets the current room by matching ID', () => {
    // Selecting a valid room ID should update currentRoom to the matching object
    const { result } = renderHook(() => useLocationDetection());

    act(() => result.current.setRoomManually('kitchen'));

    expect(result.current.currentRoom).toEqual({ id: 'kitchen', label: 'Kitchen' });
  });

  test('setRoomManually switches between rooms correctly', () => {
    // Moving from one room to another should update currentRoom each time
    const { result } = renderHook(() => useLocationDetection());

    act(() => result.current.setRoomManually('kitchen'));
    expect(result.current.currentRoom.id).toBe('kitchen');

    act(() => result.current.setRoomManually('bedroom'));
    expect(result.current.currentRoom.id).toBe('bedroom');
  });

  test('setRoomManually with an unknown ID sets currentRoom to null', () => {
    // An unrecognised room ID must not leave a stale or incorrect room active
    const { result } = renderHook(() => useLocationDetection());

    act(() => result.current.setRoomManually('nonexistent_room'));

    expect(result.current.currentRoom).toBeNull();
  });

  test('setRoomManually with null clears the current room', () => {
    // Passing null should explicitly deselect any active room
    const { result } = renderHook(() => useLocationDetection());

    act(() => result.current.setRoomManually('kitchen'));
    expect(result.current.currentRoom).not.toBeNull();

    act(() => result.current.setRoomManually(null));
    expect(result.current.currentRoom).toBeNull();
  });

  test('setRoomManually does not throw for any input', () => {
    // The hook must be resilient to unexpected argument types
    const { result } = renderHook(() => useLocationDetection());

    expect(() => {
      act(() => result.current.setRoomManually(undefined));
      act(() => result.current.setRoomManually(''));
      act(() => result.current.setRoomManually(null));
    }).not.toThrow();
  });
});
