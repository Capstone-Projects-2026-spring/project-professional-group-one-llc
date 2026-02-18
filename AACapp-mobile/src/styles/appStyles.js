import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sentenceBar: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 12,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sentenceScroll: {
    maxHeight: 40,
  },
  sentenceContent: {
    alignItems: 'center',
    gap: 6,
  },
  sentencePlaceholder: {
    color: '#aaa',
    fontSize: 16,
    fontStyle: 'italic',
  },
  sentenceWord: {
    backgroundColor: '#E8E5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sentenceWordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sentenceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 18,
  },
  speakBtn: {
    backgroundColor: '#6C63FF',
    width: 60,
  },
  speakBtnText: {
    fontSize: 20,
  },
  gridScroll: {
    flex: 1,
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tileEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  categoryBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
});

export default styles;
