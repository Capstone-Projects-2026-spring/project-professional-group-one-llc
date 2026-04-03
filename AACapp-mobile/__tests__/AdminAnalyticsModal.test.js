import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AdminAnalyticsModal from '../src/components/AdminAnalyticsModal';

describe('AdminAnalyticsModal', () => {
  // Confirms the analytics dashboard renders summary counts and recent Supabase activity.
  test('renders analytics totals and recent logs', () => {
    const { getByText } = render(
      <AdminAnalyticsModal
        visible
        analytics={{
          generatedAt: '2026-04-01T14:00:00.000Z',
          totals: {
            interactions: 18,
            devices: 4,
            rooms: 3,
            buttons: 6,
          },
          topButtons: [{ buttonName: 'speak_sentence', total: 8 }],
          topRooms: [{ roomLabel: 'Kitchen', total: 9 }],
          recentLogs: [
            {
              id: 1,
              buttonName: 'clear_sentence',
              pressedAt: '2026-04-01T13:30:00.000Z',
              roomLabel: 'Kitchen',
              deviceId: 'ios-16-abc',
            },
          ],
        }}
        errorMessage=""
        isLoading={false}
        onClose={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(getByText('Admin Analytics')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('Top Buttons')).toBeTruthy();
    expect(getByText('1. speak_sentence')).toBeTruthy();
    expect(getByText('clear_sentence')).toBeTruthy();
    expect(getByText('Room: Kitchen')).toBeTruthy();
  });

  // Verifies the refresh action is wired so admins can reload the latest summary without reopening the modal.
  test('calls onRefresh when the refresh button is pressed', () => {
    const onRefresh = jest.fn();
    const { getByText } = render(
      <AdminAnalyticsModal
        visible
        analytics={null}
        errorMessage=""
        isLoading={false}
        onClose={() => {}}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.press(getByText('Refresh'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
